/**
 * ===============================================================================
 * Suite: Timeout e Bloqueio de Compra por Expiração de Carrinho (100% Backend Real)
 * Arquivo: tests/cypress/e2e/expiracao-carrinho/timeout-reserva-carrinho-e2e.cy.js
 * ===============================================================================
 * Estratégia Zero-Mock:
 * - Cria carrinho real com item reservado no PostgreSQL (deduzindo estoque físico).
 * - Aciona a liberação/expiração real do carrinho no backend via PUT /api/carrinho/itens
 *   com quantidade 0 (que invoca Pedido.ExpirarCarrinho, devolve o item ao estoque físico
 *   e grava CarrinhoExpiradoEm no banco!).
 * - Verifica na UI real (GET /api/checkout/contexto real) o banner de expiração e o
 *   bloqueio do botão de checkout, além da rejeição HTTP 400 em POST /api/checkout/finalizar.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Expiração de Carrinho - Bloqueio de Checkout e Liberação Real de Estoque', () => {
  let clienteTeste;
  let enderecoReal;
  let cartaoReal;
  let skuReal;
  let estoqueAntesDaReserva;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 4 }).then((res) => {
      skuReal = res;
      estoqueAntesDaReserva = res.estoque.quantidade;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'TimeoutReserva' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoReal = end;
          return cy.criarCartaoReal(cli.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoReal = cartao;
        });
    });
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  it('desabilita o botão de checkout, exibe banner de expiração real e devolve o item ao estoque físico', () => {
    // 1. Adiciona item ao carrinho (reserva estoque físico) e em seguida expira o carrinho no banco
    cy.adicionarItemCarrinhoReal(clienteTeste.id, skuReal.estoque.id, 1)
      .then((carrinhoAtivo) => {
        const itemId = carrinhoAtivo.itens[0].id;
        return cy.request({
          method: 'PUT',
          url: `${apiUrl}/carrinho/itens`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) },
          body: { itens: [{ itemId, quantidade: 0 }] }
        });
      })
      .then((resPut) => {
        expect(resPut.status).to.eq(200);
        expect(resPut.body.expirado).to.be.true;
        expect(resPut.body.compraHabilitada).to.be.false;

        // Comprova que o estoque físico no PostgreSQL foi integralmente restaurado
        cy.request('GET', `${apiUrl}/produtos/${skuReal.produto.id}`).then((resProd) => {
          const skuAtual = resProd.body.estoques.find(
            (e) => (e.estoqueId ?? e.id) === skuReal.estoque.id
          );
          expect(skuAtual.quantidade).to.eq(estoqueAntesDaReserva);
        });

        cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carrinhoExpirado');

        cy.visit(`carrinho.html?id=${clienteTeste.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
          }
        });

        cy.wait('@carrinhoExpirado').then((interception) => {
          expect(interception.response.statusCode).to.eq(200);
          expect(interception.response.body.carrinho.expirado).to.be.true;
        });

        cy.get('.btn-checkout-black').should('be.disabled');
        cy.get('#cart-timer-box').should('be.visible');
        cy.contains(
          'O tempo limite de reserva de 15 minutos esgotou e os itens foram devolvidos ao estoque',
          { matchCase: false }
        ).should('be.visible');
      });
  });

  it('rejeita tentativa de finalizar checkout na API real quando o carrinho está expirado/vazio (HTTP 400)', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(clienteTeste.id)
      },
      body: {
        usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
        codigosCupons: [],
        cartoes: [{ usuarioCartaoId: cartaoReal.id, valor: 100.0 }]
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.match(/expir|carrinho|vazio/i);
    });
  });
});
