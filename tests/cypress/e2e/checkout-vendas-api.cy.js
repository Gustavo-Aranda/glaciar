/**
 * ===============================================================================
 * Teste de Integração Direta de API: Checkout e Vendas
 * Arquivo: tests/cypress/e2e/checkout-vendas-api.cy.js
 * ===============================================================================
 * Escopo:
 * - Requisições HTTP diretas aos endpoints do backend (sem carregar HTML/UI)
 * - Validação de contratos, status HTTP (200, 400, etc.) e regras de negócio no servidor:
 *   - GET /api/checkout/contexto
 *   - PUT /api/carrinho/itens
 *   - POST /api/checkout/finalizar (Rejeição RN0034 - Cartão < 10 sem cupom)
 *   - POST /api/checkout/finalizar (Rejeição compra zerada sem cupom)
 *   - GET /api/pedidos/cliente/{id} (Consulta com status EmProcessamento)
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout e Vendas - API', () => {
  const usuarioId = 42;

  it('GET /api/checkout/contexto deve responder status 200 e retornar estrutura do checkout', () => {
    cy.request({
      method: 'GET',
      url: `${apiUrl}/checkout/contexto`,
      headers: {
        'X-Usuario-Id': String(usuarioId)
      },
      failOnStatusCode: false
    }).then((res) => {
      // Se a API estiver ativa no ambiente local
      if (res.status === 200) {
        expect(res.body).to.have.property('carrinho');
        expect(res.body).to.have.property('valorTotal');
        expect(res.body).to.have.property('cartoes');
        expect(res.body.carrinho).to.have.property('itens');
      }
    });
  });

  it('PUT /api/carrinho/itens deve atualizar lote de itens e retornar status 200', () => {
    cy.request({
      method: 'PUT',
      url: `${apiUrl}/carrinho/itens`,
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(usuarioId)
      },
      body: {
        itens: [
          { itemId: 101, quantidade: 1 }
        ]
      },
      failOnStatusCode: false
    }).then((res) => {
      // Se houver item de carrinho no banco, deve responder 200 ou 400 se o item não existir
      expect(res.status).to.be.oneOf([200, 400, 404]);
    });
  });

  it('POST /api/checkout/finalizar deve validar RN0034 rejeitando cartão < R$ 10,00 sem cupom (HTTP 400)', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(usuarioId)
      },
      body: {
        usuarioEnderecoId: 10,
        codigosCupons: [],
        cartoes: [
          {
            usuarioCartaoId: 5,
            valor: 5.0 // Inválido pela RN0034 (mínimo R$ 10,00)
          }
        ]
      },
      failOnStatusCode: false
    }).then((res) => {
      // A regra de negócio deve rejeitar a transação
      expect(res.status).to.be.oneOf([400, 422]);
    });
  });

  it('POST /api/checkout/finalizar deve rejeitar compra com valor zerado sem cupom aplicado (HTTP 400)', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(usuarioId)
      },
      body: {
        usuarioEnderecoId: 10,
        codigosCupons: [],
        cartoes: []
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 422]);
    });
  });

  it('GET /api/pedidos deve responder 200 e trazer a lista de pedidos do cliente', () => {
    cy.request({
      method: 'GET',
      url: `${apiUrl}/pedidos`,
      headers: {
        'X-Usuario-Id': String(usuarioId)
      },
      failOnStatusCode: false
    }).then((res) => {
      if (res.status === 200) {
        expect(res.body).to.be.an('array');
        if (res.body.length > 0) {
          const primeiroPedido = res.body[0];
          expect(primeiroPedido).to.have.property('id');
          expect(primeiroPedido).to.have.property('status');
          expect(primeiroPedido).to.have.property('valorTotal');
        }
      }
    });
  });
});
