/**
 * ===============================================================================
 * Teste E2E: Checkout Simples com Dados Salvos - Cliente (100% Backend Real)
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-simples-cliente.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

describe('Checkout simples com dados pré-cadastrados - Cliente (API Real)', () => {
  let clienteTeste;
  let enderecoSalvo;
  let cartaoSalvo;
  let skuReal;
  let contextoReal;
  let pedidosCriados = [];

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 6 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'CheckoutSimples' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, {
          apelido: 'Casa Mogi',
          logradouro: 'Rua das Flores',
          numero: '123',
          cidade: 'Mogi das Cruzes',
          estado: 'SP',
          padrao: true
        })
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

  const prepararCarrinhoEVisitarCheckout = () => {
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
          contextoReal = interception.response.body;
        });
      });
  };

  it('carrega endereço principal e cartão vinculado automaticamente do PostgreSQL', () => {
    prepararCarrinhoEVisitarCheckout();

    cy.then(() => {
      cy.get('#usar-existente').should('be.checked');
      cy.get('#endereco-info').should('contain', 'Rua das Flores, 123');
      cy.get('#resumo-subtotal').should('contain', formatarBRL(contextoReal.carrinho.subtotal));
      cy.get('#resumo-frete').should('contain', formatarBRL(contextoReal.valorFrete));
      cy.get('#resumo-total').should('contain', formatarBRL(contextoReal.valorTotal));

      cy.get(`.input-valor-cartao[data-cartao-id="${cartaoSalvo.id}"]`).should(
        'have.value',
        Number(contextoReal.valorTotal).toFixed(2)
      );
    });
  });

  it('finaliza a compra real com sucesso, grava EmProcessamento e exibe em Meus Pedidos', () => {
    prepararCarrinhoEVisitarCheckout();

    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarPedido');

    cy.get('.btn-submit').click();

    cy.wait('@finalizarPedido').then((interception) => {
      expect(interception.request.headers['x-usuario-id']).to.eq(String(clienteTeste.id));
      expect(interception.request.body.usuarioEnderecoId).to.eq(enderecoSalvo.usuarioEnderecoId);
      expect(interception.request.body.cartoes).to.have.length(1);
      expect(interception.request.body.cartoes[0].usuarioCartaoId).to.eq(cartaoSalvo.id);
      expect(interception.request.body.cartoes[0].valor).to.eq(Number(contextoReal.valorTotal));

      expect(interception.response.statusCode).to.eq(200);
      const pedidoCriado = interception.response.body;
      pedidosCriados.push(pedidoCriado.id);
      expect(pedidoCriado.status).to.eq('EmProcessamento');

      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', pedidoCriado.codigo)
        .and('contain', 'Valor Final:')
        .and('contain', formatarBRL(pedidoCriado.valorTotal));

      // Valida persistência real na tela de histórico Meus Pedidos
      cy.intercept('GET', `${apiUrl}/pedidos*`).as('listarPedidos');
      cy.visit(`pedidos.html?id=${clienteTeste.id}`, {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
        }
      });

      cy.wait('@listarPedidos').its('response.statusCode').should('eq', 200);
      cy.get('.order-card').should('be.visible');
      cy.get('.order-number').should('contain', pedidoCriado.codigo);
      cy.get('.status')
        .should('have.class', 'status-atencao')
        .and('contain', 'Em Processamento');
    });
  });

  it('recalcula o frete dinamicamente no backend real com base na UF do endereço (RF0034)', () => {
    prepararCarrinhoEVisitarCheckout();

    // Região Norte (AM) tem tarifa base R$ 35,00 para 1 item no FreteService real (vs R$ 15,00 em SP)
    cy.intercept('GET', `${apiUrl}/carrinho/frete/AM`).as('calcularFreteAM');

    cy.get('#btn-toggle-endereco').click();
    cy.get('#novo-endereco-form').should('have.class', 'active');
    cy.get('#estado').select('AM');

    cy.wait('@calcularFreteAM').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const freteAM = Number(interception.response.body.valorFrete ?? interception.response.body.valor);
      expect(freteAM).to.eq(35.0);

      const subtotal = Number(contextoReal.carrinho.subtotal);
      cy.get('#resumo-frete').should('contain', '35,00');
      cy.get('#resumo-total').should('contain', formatarBRL(subtotal + freteAM));
    });
  });
});
