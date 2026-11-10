/**
 * ===============================================================================
 * Teste E2E: Checkout com Múltiplos Cartões (RN0034) - Cliente (100% Backend Real)
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-multiplos-cartoes-cliente.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout com múltiplos cartões (RN0034) - Cliente (API Real)', () => {
  let clienteTeste;
  let cartao1;
  let cartao2;
  let skuReal;
  let totalCompra;
  let pedidosCriados = [];

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 6 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'MultiCartoes' }).then((cli) => {
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
          totalCompra = Number(interception.response.body.valorTotal);
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

  it('RN0034: rejeita cartão 2 com valor abaixo do piso mínimo (R$ 5,00 < R$ 10,00)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');

    const valor1 = (totalCompra - 5.0).toFixed(2);
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type(valor1);
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type('5.00');
    cy.get('.btn-submit').click();

    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'O valor mínimo por cartão de crédito é R$ 10,00.');
    cy.get('@tentativaEnvio.all').should('have.length', 0);
  });

  it('RN0034: rejeita cartão 1 com valor de borda inválido (R$ 9,99 < R$ 10,00)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');

    const valor2 = (totalCompra - 9.99).toFixed(2);
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type('9.99');
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type(valor2);
    cy.get('.btn-submit').click();

    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'O valor mínimo por cartão de crédito é R$ 10,00.');
    cy.get('@tentativaEnvio.all').should('have.length', 0);
  });

  it('RN0034: aprova pagamento real exatamente no piso mínimo no cartão 1 (R$ 10,00 e saldo restante)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarMultiplos');

    const valor1 = 10.0;
    const valor2 = Number((totalCompra - 10.0).toFixed(2));

    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type(valor1.toFixed(2));
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type(valor2.toFixed(2));
    cy.get('.btn-submit').click();

    cy.wait('@finalizarMultiplos').then((interception) => {
      expect(interception.request.body.cartoes).to.have.length(2);
      expect(interception.request.body.cartoes[0].valor).to.eq(valor1);
      expect(interception.request.body.cartoes[1].valor).to.eq(valor2);

      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.status).to.eq('EmProcessamento');
      pedidosCriados.push(interception.response.body.id);

      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', interception.response.body.codigo);
    });
  });

  it('RN0034: aprova pagamento real com divisão equilibrada entre os dois cartões (>= R$ 10,00 cada)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarDividido');

    const metade1 = Math.floor((totalCompra / 2) * 100) / 100;
    const metade2 = Number((totalCompra - metade1).toFixed(2));

    cy.get(`.input-valor-cartao[data-cartao-id="${cartao1.id}"]`).clear().type(metade1.toFixed(2));
    cy.get(`.input-valor-cartao[data-cartao-id="${cartao2.id}"]`).clear().type(metade2.toFixed(2));
    cy.get('.btn-submit').click();

    cy.wait('@finalizarDividido').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.status).to.eq('EmProcessamento');
      expect(interception.response.body.pagamentos).to.have.length(2);
      pedidosCriados.push(interception.response.body.id);

      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', interception.response.body.codigo);
    });
  });
});
