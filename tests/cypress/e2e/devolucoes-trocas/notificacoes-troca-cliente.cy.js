/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E & API)
 * Suite: Notificações de Troca Autorizada ao Cliente
 * Arquivo: tests/cypress/e2e/devolucoes-trocas/notificacoes-troca-cliente.cy.js
 * ===============================================================================
 * Escopo:
 * - Regra do DRS: Quando o Administrador autoriza a troca (TrocaAceita), o cliente é notificado.
 * - Exibição de banner destacado no topo de pedidos.html com avisos não lidos.
 * - Ação de dispensar / marcar notificação como lida via PATCH /api/notificacoes/{id}/lida.
 * - Desaparecimento reativo do banner após a leitura.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Devoluções e Trocas - Notificações em Tempo Real ao Cliente', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria@example.com'
  };

  const notificacaoMock = {
    id: 15,
    usuarioId: 42,
    titulo: 'Troca Autorizada',
    mensagem: 'Sua solicitação de troca para o pedido #PED-701 foi aprovada pela nossa equipe. Despache nos Correios.',
    lida: false,
    tipo: 'TrocaAutorizada',
    referenciaId: 701,
    dataCriacao: new Date().toISOString()
  };

  it('deve exibir o banner de notificação no topo de Meus Pedidos quando houver aviso não lido', () => {
    cy.intercept('GET', `${apiUrl}/pedidos`, {
      statusCode: 200,
      body: []
    }).as('pedidos');

    cy.intercept('GET', `${apiUrl}/notificacoes`, {
      statusCode: 200,
      body: [notificacaoMock]
    }).as('obterNotificacoes');

    cy.visit('pedidos.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@obterNotificacoes');

    // O container de notificações deve estar visível
    cy.get('#notificacoes-container').should('be.visible').and('not.have.class', 'hidden');
    cy.contains('Troca Autorizada').should('be.visible');
    cy.contains('Sua solicitação de troca para o pedido #PED-701 foi aprovada').should('be.visible');
  });

  it('deve marcar a notificação como lida e ocultar o banner ao clicar em "Marcar como lida"', () => {
    cy.intercept('GET', `${apiUrl}/pedidos`, {
      statusCode: 200,
      body: []
    }).as('pedidos');

    cy.intercept('GET', `${apiUrl}/notificacoes`, {
      statusCode: 200,
      body: [notificacaoMock]
    }).as('obterNotificacoes');

    cy.intercept('PATCH', `${apiUrl}/notificacoes/15/lida`, {
      statusCode: 204
    }).as('marcarComoLida');

    cy.visit('pedidos.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@obterNotificacoes');

    // Clica no botão de marcar como lida
    cy.get('#notificacao-15 .notificacao-btn-fechar').click();

    cy.wait('@marcarComoLida');

    // O card individual deve ser removido do DOM
    cy.get('#notificacao-15').should('not.exist');

    // Como era a única notificação, o container deve ficar oculto
    cy.get('#notificacoes-container').should('have.class', 'hidden');
  });
});
