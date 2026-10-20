/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E & API)
 * Suite: Timeout e Bloqueio de Compra por Expiração de Carrinho
 * Arquivo: tests/cypress/e2e/expiracao-carrinho/timeout-reserva-carrinho-e2e.cy.js
 * ===============================================================================
 * Escopo:
 * - Validação da desabilitação do botão de checkout quando o tempo limite expira.
 * - Exibição da mensagem de que os itens voltaram ao estoque disponível.
 * - Reativação/Renovação de reserva através da interface.
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
          quantidadeItens: 1,
          subtotal: 650.0,
          itens: [itemMock],
          expiraEm: new Date(Date.now() - 60000).toISOString(),
          segundosRestantes: 0,
          exibirAvisoExpiracao: false,
          expirado: true,
          compraHabilitada: false
        },
        valorFrete: 35.0,
        valorTotal: 685.0
      }
    }).as('carrinhoExpirado');

    cy.visit('carrinho.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carrinhoExpirado');

    // 1. O botão de finalizar compra deve estar desabilitado
    cy.get('#btn-finalizar-compra').should('be.disabled');

    // 2. Banner de alerta de expiração visível
    cy.get('#carrinho-aviso-expirado').should('be.visible');
    cy.contains('Sua reserva expirou e os itens retornaram ao estoque', { matchCase: false })
      .should('be.visible');

    // 3. Temporizador com badge de expirado
    cy.get('#carrinho-timer-container, .carrinho-timer')
      .should('have.class', 'timer-expirado');
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

  it('deve permitir ao cliente tentar renovar a reserva com 1 clique', () => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: {
        carrinho: {
          id: 1,
          quantidadeItens: 1,
          subtotal: 650.0,
          itens: [itemMock],
          segundosRestantes: 0,
          expirado: true,
          compraHabilitada: false
        },
        valorFrete: 35.0,
        valorTotal: 685.0
      }
    }).as('carrinhoExpiradoInicial');

    cy.visit('carrinho.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carrinhoExpiradoInicial');

    // Intercepta renovação bem-sucedida (reiniciando timer com 900s / 15min)
    cy.intercept('PUT', `${apiUrl}/carrinho/itens`, {
      statusCode: 200,
      body: {
        id: 1,
        segundosRestantes: 900,
        expirado: false,
        compraHabilitada: true
      }
    }).as('renovarCarrinho');

    cy.get('#btn-renovar-reserva').click();
    cy.wait('@renovarCarrinho');
  });
});
