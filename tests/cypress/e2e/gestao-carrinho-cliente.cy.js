/**
 * ===============================================================================
 * Teste E2E: Gestão do Carrinho de Compras - Cliente
 * Arquivo: tests/cypress/e2e/gestao-carrinho-cliente.cy.js
 * ===============================================================================
 * Escopo:
 * - Carregamento do carrinho com múltiplos itens
 * - Alteração de quantidade (+ e -) e atualização visual reativa dos subtotais e totais
 * - Sincronização em lote via PUT /api/carrinho/itens e avanço para checkout
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Gestão do carrinho de compras - Cliente', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria.silva@example.com'
  };

  const itensCarrinho = [
    {
      id: 101,
      nomeProduto: 'Casaco Polar Térmico',
      tamanho: 'G',
      cor: 'Preto',
      sku: 'CAS-POL-G-PRT',
      precoUnitario: 100.0,
      quantidade: 1,
      estoqueDisponivel: 5,
      disponivel: true
    },
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
  ];

  const contextoCarrinho = {
    carrinho: {
      id: 1,
      quantidadeItens: 2,
      subtotal: 150.0,
      itens: itensCarrinho
    },
    valorFrete: 20.0,
    valorTotal: 170.0
  };

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: contextoCarrinho
    }).as('carregarContexto');

    cy.visit('carrinho.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carregarContexto');
  });

  it('lista múltiplos itens com seus preços e quantidades', () => {
    cy.get('.cart-items-section').should('be.visible');
    cy.get('[data-item-id="101"]').should('contain', 'Casaco Polar Térmico');
    cy.get('[data-item-id="102"]').should('contain', 'Bota Glaciar Impermeável');

    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should('contain', '150,00');
    cy.get('.summary-details .summary-line:nth-child(2) span:nth-child(2)').should('contain', '20,00');
    cy.get('.summary-total span:nth-child(2)').should('contain', '170,00');
  });

  it('incrementa e decrementa quantidades recalculando visualmente os subtotais e total', () => {
    // 1. Incrementa Casaco Polar Térmico (+1) -> quantidade 2
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('[data-item-id="101"] .qty-input').should('have.value', '2');

    // Subtotal: 200 + 50 = 250; Total estimado: 250 + 20 = 270
    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should('contain', '250,00');
    cy.get('.summary-total span:nth-child(2)').should('contain', '270,00');

    // 2. Decrementa Casaco Polar Térmico (-1) -> quantidade 1
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').click();
    cy.get('[data-item-id="101"] .qty-input').should('have.value', '1');

    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should('contain', '150,00');
    cy.get('.summary-total span:nth-child(2)').should('contain', '170,00');
  });

  it('sincroniza as alterações locais via PUT na API ao prosseguir para o checkout', () => {
    cy.intercept('PUT', `${apiUrl}/carrinho/itens`, (req) => {
      expect(req.headers['x-usuario-id']).to.eq('42');
      expect(req.body.itens).to.deep.equal([{ itemId: 101, quantidade: 2 }]);

      req.reply({
        statusCode: 200,
        body: {
          id: 1,
          quantidadeItens: 3,
          subtotal: 250.0,
          itens: [
            { ...itensCarrinho[0], quantidade: 2 },
            itensCarrinho[1]
          ]
        }
      });
    }).as('sincronizarCarrinho');

    // Altera quantidade e avança
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('.btn-checkout-black').click();

    cy.wait('@sincronizarCarrinho');
    cy.location('pathname').should('contain', 'checkout.html');
  });
});
