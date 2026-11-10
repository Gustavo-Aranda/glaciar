/**
 * ===============================================================================
 * Teste E2E: Checkout com Troco em Cupom de Troca (RN0036 e RN0033) - 100% Backend Real
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-troco-cupom-cliente.cy.js
 * ===============================================================================
 * Estratégia Real:
 * - Os cupons de troca (TROCA-XXXXXXXX) são gerados 100% via API real ao concluir a troca
 *   (status Trocado) de um pedido real de valor superior (ex: Jaqueta R$ 890,00), devolvendo
 *   o item ao estoque físico e emitindo o crédito real no PostgreSQL para o cliente!
 * - Em seguida, o cliente realiza uma compra real menor (ex: R$ 390,00 + R$ 15,00 = R$ 405,00),
 *   liquidando com R$ 0,00 a pagar e recebendo o novo cupom de troco real no banco!
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

describe('Checkout com troco em cupom de troca (RN0036 e RN0033) - Cliente (API Real)', () => {
  let clienteTeste;
  let enderecoSalvo;
  let cartaoSalvo;
  let skuAltoValor;
  let skuMenorValor;
  let pedidosEmProcessamento = [];

  /**
   * Emite um cupom de troca REAL no PostgreSQL concluindo o ciclo completo de troca de um pedido real
   */
  const emitirCupomTrocaReal = () =>
    cy
      .criarPedidoReal({
        usuarioId: clienteTeste.id,
        usuarioEnderecoId: enderecoSalvo.usuarioEnderecoId,
        usuarioCartaoId: cartaoSalvo.id,
        estoqueId: skuAltoValor.estoque.id,
        quantidade: 1,
        statusAlvo: 'Trocado'
      })
      .then(() =>
        cy.request({
          method: 'GET',
          url: `${apiUrl}/cupons/trocas`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) }
        })
      )
      .then((resCupons) => {
        expect(resCupons.status).to.eq(200);
        expect(resCupons.body.length, 'cupons de troca disponíveis na carteira').to.be.greaterThan(0);
        return resCupons.body[resCupons.body.length - 1];
      });

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 5, minPreco: 800 }).then((alto) => {
      skuAltoValor = alto;
      return cy
        .obterSkuComEstoqueReal({
          minEstoque: 5,
          maxPreco: 450,
          excluirProdutoIds: [alto.produto.id]
        })
        .then((baixo) => {
          skuMenorValor = baixo;
        });
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'TrocoCupomReal' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoSalvo = end;
          return cy.criarCartaoReal(cli.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoSalvo = cartao;
        });
    });
  });

  afterEach(() => {
    pedidosEmProcessamento.reverse().forEach((pedidoId) => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/admin/pedidos/${pedidoId}/status`,
        body: { status: 'Cancelado' },
        failOnStatusCode: false
      });
    });
    pedidosEmProcessamento = [];
    if (clienteTeste?.id) {
      cy.esvaziarCarrinhoReal(clienteTeste.id);
    }
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  const visitarCheckoutComItemMenor = () =>
    cy
      .esvaziarCarrinhoReal(clienteTeste.id)
      .then(() => cy.adicionarItemCarrinhoReal(clienteTeste.id, skuMenorValor.estoque.id, 1))
      .then(() => {
        cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carregarContexto');
        cy.visit(`checkout.html?id=${clienteTeste.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
          }
        });
        return cy.wait('@carregarContexto').its('response.body');
      });

  it('zera o saldo a pagar quando o cupom de troca real cobre 100% da compra sem exigir cartão', () => {
    emitirCupomTrocaReal().then((cupomTroca) => {
      visitarCheckoutComItemMenor().then((contexto) => {
        cy.intercept('GET', `${apiUrl}/cupons/validar/${cupomTroca.codigo}`).as('validarCupomTroca');

        cy.get('#btn-toggle-cupom').click();
        cy.get('#cupom-codigo').type(cupomTroca.codigo);
        cy.get('#btn-aplicar-cupom').click();

        cy.wait('@validarCupomTroca').its('response.statusCode').should('eq', 200);

        cy.get('#resumo-desconto').should('contain', formatarBRL(contexto.valorTotal));
        cy.get('#resumo-total').should('contain', '0,00');
      });
    });
  });

  it('finaliza o pedido com R$ 0,00 e persiste novo cupom de troco real no PostgreSQL (RN0036)', () => {
    emitirCupomTrocaReal().then((cupomTroca) => {
      visitarCheckoutComItemMenor().then((contexto) => {
        const trocoEsperado = Number((cupomTroca.valorDesconto - contexto.valorTotal).toFixed(2));

        cy.intercept('GET', `${apiUrl}/cupons/validar/${cupomTroca.codigo}`).as('validarCupomTroca');
        cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarComTroco');

        cy.get('#btn-toggle-cupom').click();
        cy.get('#cupom-codigo').type(cupomTroca.codigo);
        cy.get('#btn-aplicar-cupom').click();
        cy.wait('@validarCupomTroca').its('response.statusCode').should('eq', 200);

        cy.get('.btn-submit').click();

        cy.wait('@finalizarComTroco').then((interception) => {
          expect(interception.request.body.codigosCupons).to.deep.equal([cupomTroca.codigo]);
          expect(interception.request.body.cartoes).to.be.an('array').that.is.empty;

          expect(interception.response.statusCode).to.eq(200);
          const pedido = interception.response.body;
          pedidosEmProcessamento.push(pedido.id);

          expect(pedido.status).to.eq('EmProcessamento');
          expect(pedido.valorTotal).to.eq(0.0);
          expect(pedido.cupomTrocaGerado).to.exist;
          expect(pedido.cupomTrocaGerado.valorDesconto).to.eq(trocoEsperado);

          const codigoTroco = pedido.cupomTrocaGerado.codigo;

          cy.get('.checkout-main')
            .should('contain', 'Compra finalizada com sucesso!')
            .and('contain', pedido.codigo)
            .and('contain', '0,00')
            .and('contain', 'Novo Cupom de Troca Gerado!')
            .and('contain', codigoTroco)
            .and('contain', formatarBRL(trocoEsperado));

          // Comprova que o novo cupom de troco foi realmente gravado no banco e pertence ao cliente
          cy.request('GET', `${apiUrl}/cupons/cliente/${clienteTeste.id}`).then((resLista) => {
            expect(resLista.status).to.eq(200);
            const cupomPersistido = resLista.body.find((c) => c.codigo === codigoTroco);
            expect(cupomPersistido, 'cupom de troco persistido no banco').to.exist;
            expect(cupomPersistido.valorDesconto).to.eq(trocoEsperado);
            expect(cupomPersistido.categoria).to.eq('Troca');
          });
        });
      });
    });
  });

  it('rejeita a aplicação de um segundo cupom promocional na mesma compra (RN0033)', () => {
    visitarCheckoutComItemMenor().then(() => {
      cy.intercept('GET', `${apiUrl}/cupons/validar/PROMO20`).as('validarPrimeiroPromo');
      cy.intercept('GET', `${apiUrl}/cupons/validar/PROMO30`).as('validarSegundoPromo');

      cy.get('#btn-toggle-cupom').click();
      cy.get('#cupom-codigo').type('PROMO20');
      cy.get('#btn-aplicar-cupom').click();
      cy.wait('@validarPrimeiroPromo').its('response.statusCode').should('eq', 200);

      cy.get('#cupom-mensagem-feedback')
        .should('be.visible')
        .and('contain', "Cupom 'PROMO20' aplicado com sucesso!");

      cy.get('#cupom-codigo').type('PROMO30');
      cy.get('#btn-aplicar-cupom').click();
      cy.wait('@validarSegundoPromo').its('response.statusCode').should('eq', 200);

      cy.get('#cupom-mensagem-feedback')
        .should('be.visible')
        .and('contain', 'Apenas 1 cupom promocional é permitido por compra');
    });
  });

  it('bloqueia no backend real a inserção desnecessária de cupons quando o saldo já foi 100% quitado (RN0036)', () => {
    let cupom1;
    let cupom2;

    emitirCupomTrocaReal()
      .then((c1) => {
        cupom1 = c1;
        return emitirCupomTrocaReal();
      })
      .then((c2) => {
        cupom2 = c2;
        return visitarCheckoutComItemMenor();
      })
      .then(() => {
        cy.intercept('GET', `${apiUrl}/cupons/validar/${cupom1.codigo}`).as('validarTroca1');
        cy.intercept('GET', `${apiUrl}/cupons/validar/${cupom2.codigo}`).as('validarTroca2');
        cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('rejeitarCupomDesnecessario');

        cy.get('#btn-toggle-cupom').click();
        cy.get('#cupom-codigo').type(cupom1.codigo);
        cy.get('#btn-aplicar-cupom').click();
        cy.wait('@validarTroca1').its('response.statusCode').should('eq', 200);

        cy.get('#cupom-codigo').type(cupom2.codigo);
        cy.get('#btn-aplicar-cupom').click();
        cy.wait('@validarTroca2').its('response.statusCode').should('eq', 200);

        cy.get('.btn-submit').click();
        cy.wait('@rejeitarCupomDesnecessario').its('response.statusCode').should('eq', 400);

        cy.get('.toast-error')
          .should('be.visible')
          .and('contain', 'é desnecessário');
      });
  });
});
