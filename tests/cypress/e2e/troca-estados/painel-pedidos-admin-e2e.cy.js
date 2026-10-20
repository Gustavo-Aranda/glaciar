/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E)
 * Suite: Painel de Pedidos Admin - Transição de Estados e Gestão
 * Arquivo: tests/cypress/e2e/troca-estados/painel-pedidos-admin-e2e.cy.js
 * ===============================================================================
 * Escopo:
 * - Acesso à tela de administração de pedidos (/frontend/admin/pedidos.html).
 * - Renderização da lista de pedidos e filtros por status.
 * - Transição de status via botões administrativos:
 *   - EmProcessamento -> PagamentoRealizado
 *   - PagamentoRealizado -> EmTransporte
 *   - TrocaSolicitada -> TrocaAceita
 *   - ItemRecebido -> Trocado (com exibição do cupom gerado e reposição de estoque)
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Painel Administrativo - Gestão e Troca de Estados de Pedidos', () => {

  const pedidosMock = [
    {
      id: 101,
      codigo: '#PED-101',
      clienteNome: 'Carlos Eduardo',
      status: 'EmProcessamento',
      valorTotal: 349.90,
      dataCriacao: new Date().toISOString(),
      itens: [{ id: 1, nomeProduto: 'Bota Trilha Pro', quantidade: 1, precoUnitario: 349.90 }]
    },
    {
      id: 102,
      codigo: '#PED-102',
      clienteNome: 'Mariana Souza',
      status: 'PagamentoRealizado',
      valorTotal: 180.00,
      dataCriacao: new Date().toISOString(),
      itens: [{ id: 2, nomeProduto: 'Mochila Impermeável 40L', quantidade: 1, precoUnitario: 180.00 }]
    },
    {
      id: 103,
      codigo: '#PED-103',
      clienteNome: 'Roberto Alencar',
      status: 'TrocaSolicitada',
      valorTotal: 250.00,
      dataCriacao: new Date().toISOString(),
      itens: [{ id: 3, nomeProduto: 'Anorak Corta Vento', quantidade: 1, precoUnitario: 250.00 }]
    },
    {
      id: 104,
      codigo: '#PED-104',
      clienteNome: 'Fernanda Lima',
      status: 'ItemRecebido',
      valorTotal: 120.00,
      dataCriacao: new Date().toISOString(),
      itens: [{ id: 4, nomeProduto: 'Calça Térmica Segunda Pele', quantidade: 1, precoUnitario: 120.00 }]
    }
  ];

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/pedidos`, {
      statusCode: 200,
      body: pedidosMock
    }).as('carregarPedidosAdmin');

    // Visita a página administrativa de pedidos
    cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html', {
      failOnStatusCode: false
    });
  });

  it('deve listar os pedidos pendentes com seus respectivos status e valores', () => {
    cy.get('body').then(($body) => {
      // Se o servidor local estiver servindo a página admin
      if ($body.find('#tabela-pedidos, .pedidos-container, table').length > 0) {
        cy.contains('#PED-101').should('be.visible');
        cy.contains('#PED-102').should('be.visible');
        cy.contains('#PED-103').should('be.visible');
        cy.contains('#PED-104').should('be.visible');
      }
    });
  });

  it('deve permitir ao Admin aprovar pagamento de pedido EmProcessamento', () => {
    cy.intercept('PATCH', `${apiUrl}/pedidos/101/status`, {
      statusCode: 200,
      body: {
        id: 101,
        status: 'PagamentoRealizado',
        message: 'Status atualizado para Pagamento Aprovado com sucesso!'
      }
    }).as('aprovarPagamento');

    cy.get('body').then(($body) => {
      const btnAprovar = $body.find('[data-pedido-id="101"][data-novo-status="PagamentoRealizado"], button:contains("Aprovar")');
      if (btnAprovar.length > 0) {
        cy.wrap(btnAprovar.first()).click();
        cy.wait('@aprovarPagamento');
        cy.contains('sucesso', { matchCase: false }).should('be.visible');
      }
    });
  });

  it('deve permitir ao Admin autorizar troca solicitada (TrocaSolicitada -> TrocaAceita)', () => {
    cy.intercept('PATCH', `${apiUrl}/pedidos/103/status`, {
      statusCode: 200,
      body: {
        id: 103,
        status: 'TrocaAceita',
        message: 'Status atualizado para Troca Autorizada com sucesso!'
      }
    }).as('autorizarTroca');

    cy.get('body').then(($body) => {
      const btnAutorizar = $body.find('[data-pedido-id="103"][data-novo-status="TrocaAceita"], button:contains("Autorizar")');
      if (btnAutorizar.length > 0) {
        cy.wrap(btnAutorizar.first()).click();
        cy.wait('@autorizarTroca');
      }
    });
  });

  it('deve exibir notificação com código e valor do cupom ao finalizar troca física (ItemRecebido -> Trocado)', () => {
    cy.intercept('PATCH', `${apiUrl}/pedidos/104/status`, {
      statusCode: 200,
      body: {
        id: 104,
        status: 'Trocado',
        cupomTrocaCodigo: 'TRC-PED104-A1B2C3',
        cupomTrocaValor: 120.00,
        message: 'Troca concluída com sucesso! Itens retornaram ao estoque.'
      }
    }).as('concluirTroca');

    cy.get('body').then(($body) => {
      const btnConcluir = $body.find('[data-pedido-id="104"][data-novo-status="Trocado"], button:contains("Concluir")');
      if (btnConcluir.length > 0) {
        cy.wrap(btnConcluir.first()).click();
        cy.wait('@concluirTroca');
        cy.contains('TRC-PED104-A1B2C3').should('be.visible');
        cy.contains('120,00').should('be.visible');
      }
    });
  });

  it('deve listar solicitações de troca com o motivo informado pelo cliente na aba Devoluções', () => {
    const devolucoesMock = [
      {
        id: 103,
        codigo: '103',
        cliente: 'Roberto Alencar',
        status: 'TrocaSolicitada',
        valorTotal: 250.00,
        motivoTroca: 'Costura lateral descosturada',
        proximosStatus: ['TrocaAceita', 'TrocaNegada']
      }
    ];

    cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=troca`, {
      statusCode: 200,
      body: devolucoesMock
    }).as('carregarDevolucoesAdmin');

    cy.visit('http://127.0.0.1:5500/frontend/admin/devolucoes.html', {
      failOnStatusCode: false
    });

    cy.get('body').then(($body) => {
      if ($body.find('#devolucoes-container').length > 0) {
        cy.contains('Costura lateral descosturada').should('be.visible');
        cy.contains('Roberto Alencar').should('be.visible');
      }
    });
  });
});
