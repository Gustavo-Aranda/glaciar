/**
 * ===============================================================================
 * Teste E2E: Painel de Pedidos Admin - Ciclo Logístico, Estoque e Trocas
 * Arquivo: tests/cypress/e2e/troca-estados/painel-pedidos-admin-e2e.cy.js
 * ===============================================================================
 * Regras do DRS e Entregas do Professor:
 * - Ciclo Logístico: EmProcessamento ➔ PagamentoRealizado ➔ EmTransporte ➔ Entregue.
 * - RN0028 & RF0053: Compra APROVADA consolida baixa física definitiva no estoque.
 * - RN0028: Compra REPROVADA desbloqueia itens e devolve ao estoque sem baixa física.
 * - RF0042 a RF0045 & RF0054: Autorização de troca pelo admin, recebimento de itens
 *   com reentrada em estoque e emissão de cupom de troca correspondente.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Painel Administrativo - Ciclo Logístico, Estoque e Trocas', () => {
  const pedidosVendaMock = [
    {
      id: 101,
      codigo: '101',
      cliente: 'Carlos Eduardo',
      status: 'EmProcessamento',
      valorTotal: 349.90,
      data: new Date().toISOString(),
      proximosStatus: ['PagamentoRealizado', 'PagamentoReprovado', 'Cancelado'],
      itens: [{ id: 1, nomeProduto: 'Bota Trilha Pro', quantidade: 1, precoUnitario: 349.90 }]
    },
    {
      id: 102,
      codigo: '102',
      cliente: 'Mariana Souza',
      status: 'PagamentoRealizado',
      valorTotal: 180.00,
      data: new Date().toISOString(),
      proximosStatus: ['EmTransporte', 'Cancelado'],
      itens: [{ id: 2, nomeProduto: 'Mochila Impermeável 40L', quantidade: 1, precoUnitario: 180.00 }]
    }
  ];

  it('lista os pedidos de venda com seus respectivos status, valores e próximos passos permitidos', () => {
    cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=venda`, {
      statusCode: 200,
      body: pedidosVendaMock
    }).as('carregarPedidosVenda');

    cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html');
    cy.wait('@carregarPedidosVenda');

    cy.get('#pedidos-container').should('be.visible');
    cy.contains('Pedido #101').should('be.visible');
    cy.contains('Carlos Eduardo').should('be.visible');
    cy.contains('Em Processamento').should('be.visible');
    cy.contains('Pedido #102').should('be.visible');
    cy.contains('Pagamento Realizado').should('be.visible');
  });

  it('permite ao Admin APROVAR pagamento consolidando a baixa definitiva de estoque (RF0053, RN0028)', () => {
    cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=venda`, {
      statusCode: 200,
      body: pedidosVendaMock
    }).as('carregarPedidosVenda');

    cy.intercept('PATCH', `${apiUrl}/admin/pedidos/101/status`, (req) => {
      expect(req.body.status).to.eq('PagamentoRealizado');
      req.reply({
        statusCode: 200,
        body: {
          message: 'Status atualizado com sucesso.',
          dados: {
            pedidoId: 101,
            statusAnterior: 'EmProcessamento',
            statusAtual: 'PagamentoRealizado',
            proximosStatus: ['EmTransporte', 'Cancelado']
          }
        }
      });
    }).as('aprovarPagamento');

    cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html');
    cy.wait('@carregarPedidosVenda');

    cy.get('#status-select-101').select('PagamentoRealizado');
    cy.get('#status-select-101').siblings('button').click();

    cy.wait('@aprovarPagamento');
    cy.get('#notificacoes-container')
      .should('be.visible')
      .and('contain', 'Status atualizado com sucesso');
  });

  it('permite ao Admin REPROVAR pagamento liberando/desbloqueando itens sem baixa física (RN0028)', () => {
    cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=venda`, {
      statusCode: 200,
      body: pedidosVendaMock
    }).as('carregarPedidosVenda');

    cy.intercept('PATCH', `${apiUrl}/admin/pedidos/101/status`, (req) => {
      expect(req.body.status).to.eq('PagamentoReprovado');
      req.reply({
        statusCode: 200,
        body: {
          message: 'Pagamento reprovado. Itens desbloqueados e devolvidos ao estoque.',
          dados: {
            pedidoId: 101,
            statusAnterior: 'EmProcessamento',
            statusAtual: 'PagamentoReprovado',
            proximosStatus: []
          }
        }
      });
    }).as('reprovarPagamento');

    cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html');
    cy.wait('@carregarPedidosVenda');

    cy.get('#status-select-101').select('PagamentoReprovado');
    cy.get('#status-select-101').siblings('button').click();

    cy.wait('@reprovarPagamento');
    cy.get('#notificacoes-container')
      .should('be.visible')
      .and('contain', 'Pagamento reprovado');
  });

  it('permite ao Admin despachar pedido aprovado para entrega alterando status para EmTransporte (RF0039)', () => {
    cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=venda`, {
      statusCode: 200,
      body: pedidosVendaMock
    }).as('carregarPedidosVenda');

    cy.intercept('PATCH', `${apiUrl}/admin/pedidos/102/status`, (req) => {
      expect(req.body.status).to.eq('EmTransporte');
      req.reply({
        statusCode: 200,
        body: {
          message: 'Status atualizado com sucesso.',
          dados: {
            pedidoId: 102,
            statusAnterior: 'PagamentoRealizado',
            statusAtual: 'EmTransporte',
            proximosStatus: ['Entregue', 'Cancelado']
          }
        }
      });
    }).as('despacharPedido');

    cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html');
    cy.wait('@carregarPedidosVenda');

    cy.get('#status-select-102').select('EmTransporte');
    cy.get('#status-select-102').siblings('button').click();

    cy.wait('@despacharPedido');
    cy.get('#notificacoes-container')
      .should('be.visible')
      .and('contain', 'Status atualizado com sucesso');
  });

  it('gerencia o ciclo de troca no painel de devoluções: autorização, reentrada em estoque e geração de cupom (RF0042 a RF0045, RF0054)', () => {
    const devolucoesMock = [
      {
        id: 103,
        codigo: '103',
        cliente: 'Roberto Alencar',
        status: 'TrocaSolicitada',
        valorTotal: 250.00,
        data: new Date().toISOString(),
        motivoTroca: 'Costura lateral descosturada no trekking',
        proximosStatus: ['TrocaAceita', 'TrocaNegada']
      },
      {
        id: 104,
        codigo: '104',
        cliente: 'Fernanda Lima',
        status: 'ItemRecebido',
        valorTotal: 120.00,
        data: new Date().toISOString(),
        motivoTroca: 'Tamanho P ficou apertado',
        proximosStatus: ['Trocado']
      }
    ];

    cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=troca`, {
      statusCode: 200,
      body: devolucoesMock
    }).as('carregarDevolucoesAdmin');

    cy.visit('http://127.0.0.1:5500/frontend/admin/devolucoes.html');
    cy.wait('@carregarDevolucoesAdmin');

    // Valida exibição dos pedidos de troca e do motivo informado pelo cliente (RF0043)
    cy.contains('Roberto Alencar').should('be.visible');
    cy.contains('Costura lateral descosturada no trekking').should('be.visible');

    // 1. Autorizar Troca (TrocaSolicitada -> TrocaAceita, RF0042)
    cy.intercept('PATCH', `${apiUrl}/admin/pedidos/103/status`, (req) => {
      expect(req.body.status).to.eq('TrocaAceita');
      req.reply({
        statusCode: 200,
        body: {
          message: 'Troca autorizada com sucesso! Notificação enviada ao cliente.',
          dados: {
            pedidoId: 103,
            statusAnterior: 'TrocaSolicitada',
            statusAtual: 'TrocaAceita',
            proximosStatus: ['ItemEnviado']
          }
        }
      });
    }).as('autorizarTrocaAdmin');

    cy.get('#status-select-103').select('TrocaAceita');
    cy.get('#status-select-103').siblings('button').click();
    cy.wait('@autorizarTrocaAdmin');

    // 2. Concluir Troca com recebimento físico, reentrada de estoque e geração de cupom (ItemRecebido -> Trocado, RF0044, RF0045, RF0054)
    cy.intercept('PATCH', `${apiUrl}/admin/pedidos/104/status`, (req) => {
      expect(req.body.status).to.eq('Trocado');
      req.reply({
        statusCode: 200,
        body: {
          message: 'Troca concluída com sucesso! Itens retornaram ao estoque.',
          dados: {
            pedidoId: 104,
            statusAnterior: 'ItemRecebido',
            statusAtual: 'Trocado',
            cupomTrocaGerado: {
              codigo: 'TRC-104-TROCA',
              valorDesconto: 120.0
            },
            proximosStatus: []
          }
        }
      });
    }).as('concluirTrocaAdmin');

    cy.get('#status-select-104').select('Trocado');
    cy.get('#status-select-104').siblings('button').click();
    cy.wait('@concluirTrocaAdmin');

    cy.get('#notificacoes-container')
      .should('be.visible')
      .and('contain', 'TRC-104-TROCA')
      .and('contain', '120,00');
  });
});
