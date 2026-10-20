/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E)
 * Suite: Temporizador de Reserva de Estoque no Carrinho de Compras
 * Arquivo: tests/cypress/e2e/expiracao-carrinho/timer-carrinho-ui.cy.js
 * ===============================================================================
 * Escopo:
 * - Exibição do container de contagem regressiva no carrinho de compras (carrinho.html).
 * - Formatação precisa de minutos e segundos (MM:SS).
 * - Gatilho de alerta visual aos 5 minutos restantes (SegundosRestantes <= 300).
 * - Disparo de notificação/toast de advertência ao cliente informando a proximidade da expiração.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Expiração de Carrinho - Temporizador e Alerta Visual de 5 Minutos', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria@example.com'
  };

  const itemMock = {
    id: 101,
    nomeProduto: 'Barraca Expedition 2P',
    quantidade: 1,
    precoUnitario: 890.0,
    subtotal: 890.0,
    disponivel: true
  };

  it('deve exibir o temporizador ativo com contagem no formato MM:SS para reserva em andamento (janela de 15 min)', () => {
    // 14 minutos restantes = 840 segundos
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: {
        carrinho: {
          id: 1,
          quantidadeItens: 1,
          subtotal: 890.0,
          itens: [itemMock],
          expiraEm: new Date(Date.now() + 840000).toISOString(),
          segundosRestantes: 840,
          exibirAvisoExpiracao: false,
          expirado: false,
          compraHabilitada: true
        },
        valorFrete: 0.0,
        valorTotal: 890.0
      }
    }).as('carrinhoAtivo');

    cy.visit('carrinho.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carrinhoAtivo');

    // O container do timer deve estar visível
    cy.get('#carrinho-timer-container, .carrinho-timer').should('be.visible');
    cy.get('#carrinho-timer-regressivo').should('contain', '14:');
  });

  it('deve acionar classe de alerta e aviso visual quando restarem 5 minutos ou menos (<= 300s)', () => {
    // 4 minutos e 30 segundos restantes = 270 segundos (gatilho de aviso aos 5 min)
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: {
        carrinho: {
          id: 1,
          quantidadeItens: 1,
          subtotal: 890.0,
          itens: [itemMock],
          expiraEm: new Date(Date.now() + 270000).toISOString(),
          segundosRestantes: 270,
          exibirAvisoExpiracao: true,
          expirado: false,
          compraHabilitada: true
        },
        valorFrete: 0.0,
        valorTotal: 890.0
      }
    }).as('carrinhoQuaseExpirando');

    cy.visit('carrinho.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carrinhoQuaseExpirando');

    // Timer em estado de atenção (classe CSS de alerta ativa)
    cy.get('#carrinho-timer-container, .carrinho-timer')
      .should('have.class', 'timer-alerta');

    // Mensagem de aviso deve estar presente
    cy.contains('Atenção: finalize sua compra nos próximos minutos', { matchCase: false })
      .should('be.visible');
  });
});
