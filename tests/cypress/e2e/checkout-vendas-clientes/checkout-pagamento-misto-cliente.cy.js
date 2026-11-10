/**
 * ===============================================================================
 * Teste E2E: Checkout com Pagamento Misto Cupom e Cartão (RN0035) - 100% Backend Real
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-pagamento-misto-cliente.cy.js
 * ===============================================================================
 * Matemática Real na Base:
 * - Produto real de R$ 390,00 (ex: Top Segunda Pele Merino Warm) + Frete SP R$ 15,00 = R$ 405,00
 * - Cupom promocional real GLACIAR400 (-R$ 400,00) => Saldo residual exato = R$ 5,00 (< R$ 10,00)!
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout com pagamento misto cupom e cartão (RN0035) - Cliente (API Real)', () => {
  let clienteTeste;
  let cartaoPadrao;
  let skuMerino390;
  let pedidosCriados = [];

  before(() => {
    // Busca SKU real de preço R$ 390,00 na base Glaciar (total com frete SP = R$ 405,00)
    cy.obterSkuComEstoqueReal({ minEstoque: 4, precoExato: 390 }).then((res) => {
      skuMerino390 = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'PagamentoMisto' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then(() => cy.criarCartaoReal(cli.id, { padrao: true }))
        .then((cartao) => {
          cartaoPadrao = cartao;
        });
    });
  });

  beforeEach(() => {
    cy.esvaziarCarrinhoReal(clienteTeste.id)
      .then(() => cy.adicionarItemCarrinhoReal(clienteTeste.id, skuMerino390.estoque.id, 1))
      .then(() => {
        cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carregarContexto');

        cy.visit(`checkout.html?id=${clienteTeste.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
          }
        });

        cy.wait('@carregarContexto').its('response.statusCode').should('eq', 200);
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

  it('consulta cupom promocional real no backend e recalcula o saldo residual para R$ 5,00', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/GLACIAR400`).as('validarCupom');

    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('GLACIAR400');
    cy.get('#btn-aplicar-cupom').click();

    cy.wait('@validarCupom').its('response.statusCode').should('eq', 200);

    // 390,00 (produto) + 15,00 (frete SP) - 400,00 (cupom GLACIAR400) = R$ 5,00
    cy.get('#resumo-desconto').should('contain', '400,00');
    cy.get('#resumo-total').should('contain', '5,00');

    cy.get(`.input-valor-cartao[data-cartao-id="${cartaoPadrao.id}"]`).should('have.value', '5.00');
  });

  it('permite finalizar pedido real cobrando R$ 5,00 (< R$ 10,00) no cartão após abatimento de cupom (RN0035)', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/GLACIAR400`).as('validarCupom');
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarPedidoMisto');

    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('GLACIAR400');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom').its('response.statusCode').should('eq', 200);

    cy.get('.btn-submit').click();

    cy.wait('@finalizarPedidoMisto').then((interception) => {
      expect(interception.request.body.codigosCupons).to.deep.equal(['GLACIAR400']);
      expect(interception.request.body.cartoes).to.have.length(1);
      expect(interception.request.body.cartoes[0].valor).to.eq(5.0);

      expect(interception.response.statusCode).to.eq(200);
      const pedido = interception.response.body;
      pedidosCriados.push(pedido.id);

      expect(pedido.status).to.eq('EmProcessamento');
      expect(pedido.valorTotal).to.eq(5.0);
      expect(pedido.valorPagoCartoes).to.eq(5.0);

      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', pedido.codigo)
        .and('contain', 'Valor Final:')
        .and('contain', '5,00');
    });
  });
});
