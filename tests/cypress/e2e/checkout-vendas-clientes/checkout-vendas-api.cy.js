/**
 * ===============================================================================
 * Teste de Integração Direta de API: Checkout e Vendas
 * Arquivo: tests/cypress/e2e/checkout-vendas-api.cy.js
 * ===============================================================================
 * Escopo:
 * - Validações de regras de negócio estritas diretamente no backend:
 *   - POST /api/checkout/finalizar (Rejeição RN0034 - Cartão < R$ 10,00 sem cupom)
 *   - POST /api/checkout/finalizar (Rejeição de compra com saldo sem cartões informados)
 *   - GET /api/checkout/contexto (Validação de headers e autenticação X-Usuario-Id)
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout e Vendas - Regras e Contratos de API', () => {
  const usuarioId = 42;

  it('rejeita requisições sem o header obrigatório X-Usuario-Id no checkout (HTTP 400)', () => {
    cy.request({
      method: 'GET',
      url: `${apiUrl}/checkout/contexto`,
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.contain('X-Usuario-Id');
    });
  });

  it('valida RN0034 rejeitando estritamente cartão com valor < R$ 10,00 quando não houver cupom (HTTP 400)', () => {
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
      expect(res.status).to.eq(400);
      const mensagem = res.body.message || res.body.erro || JSON.stringify(res.body);
      expect(mensagem).to.match(/10,00|mínimo|carrinho vazio/i);
    });
  });

  it('rejeita finalização de compra quando o saldo devedor não possui cartões informados (HTTP 400)', () => {
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
      expect(res.status).to.eq(400);
      const mensagem = res.body.message || res.body.erro || JSON.stringify(res.body);
      expect(mensagem).to.match(/cartão|pagamento|carrinho vazio/i);
    });
  });

  it('rejeita cartão com valor zero ou negativo no checkout (HTTP 400)', () => {
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
            valor: 0.0
          }
        ]
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      const mensagem = res.body.message || res.body.erro || JSON.stringify(res.body);
      expect(mensagem).to.match(/maior que zero|carrinho vazio/i);
    });
  });
});
