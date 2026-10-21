/**
 * ===============================================================================
 * Teste E2E & Segurança: Validação de Atores e Autorização em Estados de Pedido (DRS)
 * Arquivo: tests/cypress/e2e/validacao-atores/autorizacao-cliente-admin-status.cy.js
 * ===============================================================================
 * Matriz de Permissão do DRS (PedidoMaquinaEstados):
 * - Cliente:
 *   - PODE: Confirmar Entrega (EmTransporte -> Entregue)
 *   - PODE: Solicitar Troca (Entregue -> TrocaSolicitada)
 *   - PODE: Informar Despacho do Pacote (TrocaAceita -> ItemEnviado)
 *   - NÃO PODE: Auto-aprovar pagamento (PagamentoRealizado)
 *   - NÃO PODE: Auto-aprovar troca (TrocaAceita)
 *   - NÃO PODE: Confirmar recebimento no CD ou gerar cupom (ItemRecebido, Trocado)
 * - Administrador:
 *   - PODE: Aprovar/Reprovar Pagamento, Despachar, Avaliar Trocas e Concluir Troca
 * - Segurança e Isolamento (IDOR):
 *   - Um cliente nunca pode alterar ou visualizar pedidos de outro cliente (HTTP 404)
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Validação de Atores - Permissões de Cliente vs Admin (DRS)', () => {
  const clienteId = 42;
  const outroClienteId = 99;

  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria@example.com'
  };

  context('Bloqueios de Atores Não Autorizados via API', () => {
    it('Cliente NÃO PODE auto-aprovar o próprio pagamento (EmProcessamento -> PagamentoRealizado)', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/pedidos/1/status`,
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(clienteId)
        },
        body: {
          status: 'PagamentoRealizado'
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 404]);
        if (res.status === 400) {
          expect(res.body.message || JSON.stringify(res.body)).to.match(/não pode ser executada pelo ator/i);
        }
      });
    });

    it('Cliente NÃO PODE auto-aprovar troca (TrocaSolicitada -> TrocaAceita)', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/pedidos/1/status`,
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(clienteId)
        },
        body: {
          status: 'TrocaAceita'
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 404]);
        if (res.status === 400) {
          expect(res.body.message || JSON.stringify(res.body)).to.match(/não pode ser executada pelo ator/i);
        }
      });
    });

    it('Cliente NÃO PODE auto-concluir troca física (ItemRecebido -> Trocado)', () => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/pedidos/1/status`,
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(clienteId)
        },
        body: {
          status: 'Trocado'
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([400, 404]);
        if (res.status === 400) {
          expect(res.body.message || JSON.stringify(res.body)).to.match(/não pode ser executada pelo ator/i);
        }
      });
    });
  });

  context('Permissões Válidas do Cliente via UI', () => {
    it('Cliente PODE confirmar recebimento do pedido na interface (EmTransporte -> Entregue)', () => {
      const pedidoEmTransporte = [
        {
          id: 550,
          codigo: '550',
          status: 'EmTransporte',
          data: new Date().toISOString(),
          subtotal: 150.0,
          valorFrete: 0.0,
          valorTotal: 150.0,
          proximosStatus: ['Entregue'],
          itens: [
            { id: 1, nomeProduto: 'Camisa Segunda Pele Térmica', quantidade: 1, precoUnitario: 150.0 }
          ]
        }
      ];

      cy.intercept('GET', `${apiUrl}/pedidos`, {
        statusCode: 200,
        body: pedidoEmTransporte
      }).as('obterPedidos');

      cy.intercept('PATCH', `${apiUrl}/pedidos/550/status`, (req) => {
        expect(req.body.status).to.eq('Entregue');
        req.reply({
          statusCode: 200,
          body: {
            message: 'Recebimento confirmado com sucesso.',
            dados: {
              pedidoId: 550,
              statusAnterior: 'EmTransporte',
              statusAtual: 'Entregue',
              proximosStatus: ['TrocaSolicitada']
            }
          }
        });
      }).as('confirmarRecebimentoUI');

      cy.visit('pedidos.html?id=42', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
        }
      });

      cy.wait('@obterPedidos');
      cy.get('[data-acao="confirmar-recebimento"]').click();
      cy.wait('@confirmarRecebimentoUI').its('response.statusCode').should('eq', 200);
    });

    it('Cliente PODE informar despacho do pacote de devolução na interface (TrocaAceita -> ItemEnviado)', () => {
      const pedidoEmTroca = [
        {
          id: 551,
          codigo: '551',
          status: 'TrocaAceita',
          data: new Date().toISOString(),
          subtotal: 200.0,
          valorFrete: 0.0,
          valorTotal: 200.0,
          proximosStatus: ['ItemEnviado'],
          itens: [
            { id: 2, nomeProduto: 'Bastão de Trekking Carbono', quantidade: 1, precoUnitario: 200.0 }
          ]
        }
      ];

      cy.intercept('GET', `${apiUrl}/pedidos`, {
        statusCode: 200,
        body: pedidoEmTroca
      }).as('obterPedidosTroca');

      cy.intercept('PATCH', `${apiUrl}/pedidos/551/status`, (req) => {
        expect(req.body.status).to.eq('ItemEnviado');
        req.reply({
          statusCode: 200,
          body: {
            message: 'Despacho registrado com sucesso.',
            dados: {
              pedidoId: 551,
              statusAnterior: 'TrocaAceita',
              statusAtual: 'ItemEnviado',
              proximosStatus: ['ItemRecebido']
            }
          }
        });
      }).as('despacharPacoteUI');

      cy.visit('pedidos.html?id=42', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
        }
      });

      cy.wait('@obterPedidosTroca');
      cy.get('[data-acao="confirmar-despacho"]').click();
      cy.wait('@despacharPacoteUI').its('response.statusCode').should('eq', 200);
    });
  });

  context('Isolamento IDOR entre Clientes', () => {
    it('Cliente tentando consultar pedido de outro usuário deve receber 404 sem vazamento de dados', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/pedidos/9999`,
        headers: {
          'X-Usuario-Id': String(outroClienteId)
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.eq(404);
        expect(res.body.message).to.contain('não encontrado');
      });
    });
  });
});
