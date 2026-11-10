/**
 * ===============================================================================
 * Teste E2E: Checkout com Dois Cartões e Cupom de Desconto - Cliente (100% Backend Real)
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-dois-cartoes-cupom-cliente.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

describe('Checkout com dois cartões e cupom de desconto - Cliente (API Real)', () => {
  let clienteTeste;
  let cartao1;
  let cartao2;
  let skuReal;
  let totalBruto;
  let pedidosCriados = [];

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 6, minPreco: 200 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'DoisCartoesCupom' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then(() => cy.criarCartaoReal(cli.id, { variante: 'mastercard', padrao: true }))
        .then((c1) => {
          cartao1 = c1;
          return cy.criarCartaoReal(cli.id, { variante: 'visa', padrao: false });
        })
        .then((c2) => {
          cartao2 = c2;
        });
    });
  });

  beforeEach(() => {
    cy.esvaziarCarrinhoReal(clienteTeste.id)
      .then(() => cy.adicionarItemCarrinhoReal(clienteTeste.id, skuReal.estoque.id, 1))
      .then(() => {
        cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carregarContexto');

        cy.visit(`checkout.html?id=${clienteTeste.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
          }
        });

        cy.wait('@carregarContexto').then((interception) => {
          expect(interception.response.statusCode).to.eq(200);
          totalBruto = Number(interception.response.body.valorTotal);
        });
      });
  });

  afterEach(() => {
    pedidosCriados.reverse().forEach((pedidoId) => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/admin/pedidos/${pedidoId}/status`,
        body: { status: 'Cancelado' },
        failOnStatusCode: false
      });
    });
    pedidosCriados = [];
    if (clienteTeste?.id) {
      cy.esvaziarCarrinhoReal(clienteTeste.id);
    }
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  it('realiza compra real dividindo o saldo entre dois cartões vinculados após aplicar PROMO50 (Happy Path)', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/PROMO50`).as('validarCupom');
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarComDoisCartoesECupom');

    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom').its('response.statusCode').should('eq', 200);

    const saldoRestante = Number((totalBruto - 50.0).toFixed(2));
    const parcela1 = 60.0;
    const parcela2 = Number((saldoRestante - parcela1).toFixed(2));

    cy.get('#resumo-desconto').should('contain', '50,00');
    cy.get('#resumo-total').should('contain', formatarBRL(saldoRestante));

    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type(parcela1.toFixed(2));
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type(parcela2.toFixed(2));

    cy.get('.btn-submit').click();

    cy.wait('@finalizarComDoisCartoesECupom').then((interception) => {
      expect(interception.request.body.codigosCupons).to.deep.equal(['PROMO50']);
      expect(interception.request.body.cartoes).to.have.length(2);
      expect(interception.request.body.cartoes[0]).to.deep.include({
        usuarioCartaoId: cartao1.id,
        valor: parcela1
      });
      expect(interception.request.body.cartoes[1]).to.deep.include({
        usuarioCartaoId: cartao2.id,
        valor: parcela2
      });

      expect(interception.response.statusCode).to.eq(200);
      const pedido = interception.response.body;
      pedidosCriados.push(pedido.id);

      expect(pedido.status).to.eq('EmProcessamento');
      expect(pedido.valorAbatidoCupons).to.eq(50.0);
      expect(pedido.valorTotal).to.eq(saldoRestante);

      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', pedido.codigo)
        .and('contain', formatarBRL(saldoRestante));
    });
  });

  it('permite pagar com 1 cartão vinculado + 1 novo cartão cadastrado na hora mais o cupom PROMO50 (Happy Path)', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/PROMO50`).as('validarCupom');
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarComNovoCartao');

    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom').its('response.statusCode').should('eq', 200);

    const saldoRestante = Number((totalBruto - 50.0).toFixed(2));
    const valorVinculado = 50.0;
    const valorNovo = Number((saldoRestante - valorVinculado).toFixed(2));

    // Zera o 2º cartão salvo e usa 1 cartão salvo + 1 novo cartão avulso
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type(valorVinculado.toFixed(2));
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type('0.00');

    cy.get('#btn-toggle-cartao').click();
    cy.get('#novo-cartao-form').should('have.class', 'active');

    cy.get('#cartao-nome').type('Maria Silva');
    cy.get('#cartao-bandeira').select('Visa');
    cy.get('#cartao-numero').type('4916 5114 9326 9188');
    cy.get('#cartao-mes').type('11');
    cy.get('#cartao-ano').type('2028');
    cy.get('#cartao-cvv').type('690');
    cy.get('#novo-cartao-valor').clear().type(valorNovo.toFixed(2));

    cy.get('.btn-submit').click();

    cy.wait('@finalizarComNovoCartao').then((interception) => {
      expect(interception.request.body.codigosCupons).to.deep.equal(['PROMO50']);
      expect(interception.request.body.cartoes).to.have.length(2);
      expect(interception.request.body.cartoes[0].usuarioCartaoId).to.eq(cartao1.id);
      expect(interception.request.body.cartoes[0].valor).to.eq(valorVinculado);
      expect(interception.request.body.cartoes[1].novoCartao).to.include({
        bandeira: 'Visa',
        numero: '4916511493269188',
        mesValidade: 11,
        anoValidade: 2028,
        cvv: '690'
      });

      expect(interception.response.statusCode).to.eq(200);
      const pedido = interception.response.body;
      pedidosCriados.push(pedido.id);

      expect(pedido.status).to.eq('EmProcessamento');
      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', pedido.codigo)
        .and('contain', formatarBRL(saldoRestante));
    });
  });

  it('bloqueia pagamento quando a soma dos dois cartões for inferior ao saldo restante após o cupom (Unhappy Path)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');
    cy.intercept('GET', `${apiUrl}/cupons/validar/PROMO50`).as('validarCupom');

    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom').its('response.statusCode').should('eq', 200);

    const saldoRestante = Number((totalBruto - 50.0).toFixed(2));
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type('40.00');
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type('30.00');

    cy.get('.btn-submit').click();

    cy.get('.toast-error')
      .should('be.visible')
      .and(
        'contain',
        `O total nos cartões (R$ 70,00) é inferior ao valor restante do pedido (R$ ${formatarBRL(saldoRestante)}).`
      );

    cy.get('@tentativaEnvio.all').should('have.length', 0);
  });
});
