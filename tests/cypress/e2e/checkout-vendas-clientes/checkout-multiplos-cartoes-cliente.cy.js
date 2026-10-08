/**
 * ===============================================================================
 * Teste E2E: Checkout com Múltiplos Cartões (RN0034) - Cliente
 * Arquivo: tests/cypress/e2e/checkout-multiplos-cartoes-cliente.cy.js
 * ===============================================================================
 * Regra de Negócio RN0034:
 * - O valor mínimo debitado em cada cartão de crédito deve ser de R$ 10,00.
 *
 * Cenários:
 * - Unhappy Path: Bloqueio ao tentar pagar menos de R$ 10,00 em um cartão (ex: R$ 5,00).
 * - Happy Path: Divisão válida do saldo total entre múltiplos cartões (>= R$ 10,00 cada).
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout com múltiplos cartões (RN0034) - Cliente', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria.silva@example.com'
  };

  const enderecoPadrao = {
    id: 10,
    usuarioId: 42,
    apelido: 'Casa',
    padrao: true,
    cep: '08700000',
    logradouro: 'Rua das Flores',
    numero: '123',
    bairro: 'Centro',
    cidade: 'Mogi das Cruzes',
    estado: 'SP'
  };

  const cartao1 = {
    id: 5,
    usuarioId: 42,
    ultimosDigitos: '1234',
    bandeira: 'Mastercard',
    mesValidade: 12,
    anoValidade: 2028,
    padrao: true
  };

  const cartao2 = {
    id: 6,
    usuarioId: 42,
    ultimosDigitos: '5678',
    bandeira: 'Visa',
    mesValidade: 8,
    anoValidade: 2029,
    padrao: false
  };

  const contextoMultiplosCartoes = {
    carrinho: {
      id: 1,
      quantidadeItens: 1,
      subtotal: 50.0,
      itens: [
        {
          id: 102,
          nomeProduto: 'Bota Glaciar Impermeável',
          tamanho: '41',
          cor: 'Marrom',
          sku: 'BOT-GLA-41-MRR',
          precoUnitario: 50.0,
          quantidade: 1,
          estoqueDisponivel: 10,
          disponivel: true
        }
      ]
    },
    enderecoPrincipal: enderecoPadrao,
    valorFrete: 0.0,
    valorTotal: 50.0,
    cartoes: [cartao1, cartao2]
  };

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: contextoMultiplosCartoes
    }).as('carregarContexto');

    visitarComSessao('checkout.html?id=42');
    cy.wait('@carregarContexto');
  });

  const visitarComSessao = (pagina) => {
    cy.visit(pagina, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });
  };

  it('bloqueia pagamento quando qualquer um dos cartões tiver valor inferior a R$ 10,00 (RN0034 - Unhappy Path)', () => {
    // Intercept para garantir que a API NÃO é chamada se a validação falhar
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');

    // Divide R$ 50,00 em R$ 45,00 no Cartão 1 e R$ 5,00 no Cartão 2 (inválido pela RN0034)
    cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type('45.00');
    cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type('5.00');

    cy.get('.btn-submit').click();

    // Mensagem de bloqueio da RN0034 exibida no toast
    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'O valor mínimo por cartão de crédito é R$ 10,00.');

    // Nenhuma requisição deve ter sido disparada
    cy.get('@tentativaEnvio.all').should('have.length', 0);
  });

  it('permite finalizar a compra quando o valor for distribuído respeitando o mínimo de R$ 10,00 em cada cartão (RN0034 - Happy Path)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      expect(req.body.cartoes).to.have.length(2);
      expect(req.body.cartoes[0].usuarioCartaoId).to.eq(5);
      expect(req.body.cartoes[0].valor).to.eq(30.0);
      expect(req.body.cartoes[1].usuarioCartaoId).to.eq(6);
      expect(req.body.cartoes[1].valor).to.eq(20.0);

      req.reply({
        statusCode: 200,
        body: {
          id: 701,
          codigo: 'PED-701-MULTI',
          status: 'EmProcessamento',
          valorTotal: 50.0,
          valorPagoCartoes: 50.0
        }
      });
    }).as('finalizarMultiplos');

    // Distribui R$ 30,00 e R$ 20,00 (ambos >= R$ 10,00)
    cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type('30.00');
    cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type('20.00');

    cy.get('.btn-submit').click();

    cy.wait('@finalizarMultiplos').its('response.body.status').should('eq', 'EmProcessamento');

    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-701-MULTI')
      .and('contain', '50,00');
  });
});
