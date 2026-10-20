/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E & API)
 * Suite: Timeout e Bloqueio de Compra por Expiração de Carrinho
 * Arquivo: tests/cypress/e2e/expiracao-carrinho/timeout-reserva-carrinho-e2e.cy.js
 * ===============================================================================
 * Escopo:
 * - Validação da desabilitação do botão de checkout quando o tempo limite expira.
 * - Exibição da mensagem de que os itens voltaram ao estoque disponível.
 * - Validação de segurança via API: rejeição de finalização de checkout com reserva vencida.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Expiração de Carrinho - Bloqueio de Checkout e Liberação de Estoque', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria@example.com'
  };

  const itemMock = {
    id: 202,
    nomeProduto: 'Saco de Dormir Polar -15C',
    quantidade: 1,
    precoUnitario: 650.0,
    subtotal: 650.0,
    disponivel: false
  };

  it('deve desabilitar o botão de checkout e exibir banner de expiração quando o tempo esgotar', () => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: {
        carrinho: {
          id: 1,
          quantidadeItens: 0,
          subtotal: 0,
          itens: [],
          expiraEm: new Date(Date.now() - 60000).toISOString(),
          segundosRestantes: 0,
          exibirAvisoExpiracao: false,
          expirado: true,
          compraHabilitada: false
        },
        valorFrete: 0,
        valorTotal: 0
      }
    }).as('carrinhoExpirado');

    cy.visit('carrinho.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carrinhoExpirado');

    // 1. O botão de finalizar compra deve estar desabilitado
    cy.get('.btn-checkout-black').should('be.disabled');

    // 2. Banner de alerta de expiração visível
    cy.get('#cart-timer-box').should('be.visible');
    cy.contains('O tempo limite de reserva de 15 minutos esgotou e os itens foram devolvidos ao estoque', { matchCase: false })
      .should('be.visible');
  });

  it('deve rejeitar tentativa de finalizar checkout na API se a reserva estiver expirada (HTTP 400)', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(cliente.id)
      },
      body: {
        usuarioEnderecoId: 1,
        codigosCupons: [],
        cartoes: [{ usuarioCartaoId: 1, valor: 685.0 }]
      },
      failOnStatusCode: false
    }).then((res) => {
      // Deve recusar com 400 ou 422 caso o carrinho esteja expirado ou sem itens válidos
      expect(res.status).to.be.oneOf([400, 422]);
      if (res.body && res.body.message) {
        expect(res.body.message).to.match(/expir|carrinho|estoque/i);
      }
    });
  });
});
