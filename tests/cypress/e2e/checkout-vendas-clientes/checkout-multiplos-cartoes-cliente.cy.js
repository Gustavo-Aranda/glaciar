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

  const cenariosLimiteRN0034 = [
    {
      descricao: 'rejeita cartão 2 com valor abaixo do piso (R$ 5,00 < R$ 10,00)',
      valor1: '45.00',
      valor2: '5.00',
      valido: false,
      mensagemEsperada: 'O valor mínimo por cartão de crédito é R$ 10,00.'
    },
    {
      descricao: 'rejeita cartão 1 com valor de borda inválido (R$ 9,99 < R$ 10,00)',
      valor1: '9.99',
      valor2: '40.01',
      valido: false,
      mensagemEsperada: 'O valor mínimo por cartão de crédito é R$ 10,00.'
    },
    {
      descricao: 'aprova pagamento exatamente no piso mínimo (R$ 10,00 e R$ 40,00)',
      valor1: '10.00',
      valor2: '40.00',
      valido: true
    },
    {
      descricao: 'aprova pagamento com divisão equilibrada (R$ 30,00 e R$ 20,00)',
      valor1: '30.00',
      valor2: '20.00',
      valido: true
    }
  ];

  cenariosLimiteRN0034.forEach(({ descricao, valor1, valor2, valido, mensagemEsperada }) => {
    it(`RN0034: ${descricao}`, () => {
      if (!valido) {
        cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');

        cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type(valor1);
        cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type(valor2);
        cy.get('.btn-submit').click();

        cy.get('.toast-error')
          .should('be.visible')
          .and('contain', mensagemEsperada);
        cy.get('@tentativaEnvio.all').should('have.length', 0);
      } else {
        cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
          expect(req.body.cartoes).to.have.length(2);
          expect(req.body.cartoes[0].valor).to.eq(parseFloat(valor1));
          expect(req.body.cartoes[1].valor).to.eq(parseFloat(valor2));

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

        cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type(valor1);
        cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type(valor2);
        cy.get('.btn-submit').click();

        cy.wait('@finalizarMultiplos').its('response.body.status').should('eq', 'EmProcessamento');
        cy.get('.checkout-main')
          .should('contain', 'Compra finalizada com sucesso! 🎉')
          .and('contain', 'PED-701-MULTI');
      }
    });
  });
});
