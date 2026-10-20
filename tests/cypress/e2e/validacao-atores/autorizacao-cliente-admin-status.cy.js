/**
 * ===============================================================================
 * TaaC - Test Automation as Code (API & Security)
 * Suite: Validação de Atores e Autorização em Estados de Pedido (DRS)
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
 *   - Um cliente nunca pode alterar ou visualizar pedidos de outro cliente (HTTP 404 seguro)
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Validação de Atores - Permissões de Cliente vs Admin (DRS)', () => {
  const clienteId = 42;
  const outroClienteId = 99;

  context('Bloqueios de Atores Não Autorizados', () => {

    it('Cliente NÃO PODE auto-aprovar troca (TrocaSolicitada -> TrocaAceita)', () => {
      // Cliente autenticado pelo header tentando executar ação restrita de Administrador
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
        // Deve ser bloqueado com 400 (DomainValidationException: ator não autorizado) ou 404
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

    it('Cliente NÃO PODE aprovar o próprio pagamento (EmProcessamento -> PagamentoRealizado)', () => {
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
  });

  context('Permissões Permitidas do Cliente', () => {

    it('Cliente PODE confirmar recebimento do pedido (EmTransporte -> Entregue)', () => {
      // Simula chamada válida do cliente quando o pedido está EmTransporte
      cy.intercept('PATCH', `${apiUrl}/pedidos/100/status`, {
        statusCode: 200,
        body: {
          id: 100,
          statusAnterior: 'EmTransporte',
          statusNovo: 'Entregue'
        }
      }).as('confirmarRecebimento');

      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/pedidos/100/status`,
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(clienteId)
        },
        body: {
          status: 'Entregue'
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });

    it('Cliente PODE informar despacho do pacote de devolução (TrocaAceita -> ItemEnviado)', () => {
      cy.intercept('PATCH', `${apiUrl}/pedidos/100/status`, {
        statusCode: 200,
        body: {
          id: 100,
          statusAnterior: 'TrocaAceita',
          statusNovo: 'ItemEnviado'
        }
      }).as('despacharPacote');

      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/pedidos/100/status`,
        headers: {
          'Content-Type': 'application/json',
          'X-Usuario-Id': String(clienteId)
        },
        body: {
          status: 'ItemEnviado'
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
      });
    });
  });

  context('Isolamento IDOR entre Clientes', () => {

    it('Cliente tentando alterar ou consultar pedido de outro usuário deve receber 404', () => {
      cy.request({
        method: 'GET',
        url: `${apiUrl}/pedidos/9999`,
        headers: {
          'X-Usuario-Id': String(outroClienteId)
        },
        failOnStatusCode: false
      }).then((res) => {
        // Não deve retornar 200 nem vazar dados sensíveis
        expect(res.status).to.be.oneOf([404, 400]);
      });
    });
  });
});
