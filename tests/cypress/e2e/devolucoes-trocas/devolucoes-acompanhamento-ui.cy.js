/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E)
 * Suite: Acompanhamento de Devoluções e Trocas pelo Cliente
 * Arquivo: tests/cypress/e2e/devolucoes-trocas/devolucoes-acompanhamento-ui.cy.js
 * ===============================================================================
 * Escopo:
 * - Acompanhamento do fluxo de logística reversa na tela devolucoes.html.
 * - Renderização de cards contextuais conforme o status da troca:
 *   - TrocaSolicitada: Aguardando avaliação.
 *   - TrocaAceita: Exibição do código reverso dos Correios e ação de informar despacho.
 *   - ItemEnviado: Mercadoria a caminho do CD.
 *   - ItemRecebido: Conferência física na Glaciar.
 *   - Trocado: Troca concluída e cupom gerado na conta.
 * - Empty state amigável quando o cliente não possui devoluções.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Devoluções e Trocas - Acompanhamento do Fluxo Reversivo (UI)', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria@example.com'
  };

  it('deve exibir cards ativos de troca com código reverso e permitir despachar pacote', () => {
    const pedidosComTroca = [
      {
        id: 801,
        codigo: '801',
        status: 'TrocaAceita',
        valorTotal: 450.0,
        motivoTroca: 'Produto com numeração apertada para o meu pé',
        itens: [
          { id: 1, nomeProduto: 'Bota Alpina Gore-Tex', quantidade: 1, precoUnitario: 450.0 }
        ]
      },
      {
        id: 802,
        codigo: '802',
        status: 'Trocado',
        valorTotal: 150.0,
        itens: [
          { id: 2, nomeProduto: 'Gorro de Lã Merino', quantidade: 1, precoUnitario: 150.0 }
        ]
      }
    ];

    cy.intercept('GET', `${apiUrl}/pedidos`, {
      statusCode: 200,
      body: pedidosComTroca
    }).as('carregarDevolucoes');

    cy.visit('devolucoes.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carregarDevolucoes');

    // 1. Pedido 801 em Troca Autorizada: exibe código reverso dos correios e motivo da troca
    cy.contains('Troca #801').should('be.visible');
    cy.contains('Troca Autorizada').should('be.visible');
    cy.contains('REV-801').should('be.visible');
    cy.contains('Produto com numeração apertada para o meu pé').should('be.visible');

    // 2. Pedido 802 em Troca Concluída: informa que o cupom foi emitido
    cy.contains('Troca #802').should('be.visible');
    cy.contains('Troca Concluída').should('be.visible');
    cy.contains('Cupom de Troca emitido', { matchCase: false }).should('be.visible');

    // 3. Cliente aciona o botão para informar o despacho do pacote
    cy.intercept('PATCH', `${apiUrl}/pedidos/801/status`, {
      statusCode: 200,
      body: {
        id: 801,
        status: 'ItemEnviado',
        message: 'Despacho registrado com sucesso!'
      }
    }).as('despacharPacote');

    cy.get('[data-acao="despachar-item"][data-pedido-id="801"]').click();
    
    // Confirma pelo modal/popup customizado da Glaciar (sem window.confirm)
    cy.get('#btn-modal-confirm-ok').should('be.visible').click();

    cy.wait('@despacharPacote');
  });

  it('deve exibir mensagem amigável de estado vazio caso o cliente não tenha devoluções', () => {
    // Retorna apenas pedidos normais (ex: EmTransporte ou Entregue sem troca)
    cy.intercept('GET', `${apiUrl}/pedidos`, {
      statusCode: 200,
      body: [
        { id: 999, codigo: '999', status: 'Entregue', valorTotal: 99.0, itens: [] }
      ]
    }).as('semDevolucoes');

    cy.visit('devolucoes.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@semDevolucoes');

    // Valida mensagem de empty state
    cy.contains('Nenhuma devolução ou troca ativa', { matchCase: false }).should('be.visible');
    cy.contains('Acessar Meus Pedidos').should('be.visible');
  });
});
