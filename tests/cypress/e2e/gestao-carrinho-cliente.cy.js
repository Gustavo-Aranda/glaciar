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
    cy.get('[data-item-id="101"] .price-tag').should('contain', '200,00');

    // Subtotal: 200 + 50 = 250; Total estimado: 250 + 20 = 270
    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should('contain', '250,00');
    cy.get('.summary-total span:nth-child(2)').should('contain', '270,00');

    // 2. Decrementa Casaco Polar Térmico (-1) -> quantidade 1
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').click();
    cy.get('[data-item-id="101"] .qty-input').should('have.value', '1');
    cy.get('[data-item-id="101"] .price-tag').should('contain', '100,00');

    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should('contain', '150,00');
    cy.get('.summary-total span:nth-child(2)').should('contain', '170,00');
  });

  it('desabilita botão de decrementar quando a quantidade for 1 (limite mínimo)', () => {
    // Inicialmente quantidade é 1, então o botão de decrementar deve estar desabilitado
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').should('be.disabled');

    // Ao incrementar para 2, o botão de decrementar deve ser habilitado
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('[data-item-id="101"] .qty-input').should('have.value', '2');
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').should('not.be.disabled');

    // Ao decrementar de volta para 1, volta a ficar desabilitado
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').click();
    cy.get('[data-item-id="101"] .qty-input').should('have.value', '1');
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').should('be.disabled');
  });

  it('desabilita botão de incrementar ao atingir o estoque máximo disponível', () => {
    // Casaco Polar Térmico tem estoqueDisponivel = 5
    // Incrementa até o limite de 5
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click(); // 2
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click(); // 3
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click(); // 4
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click(); // 5

    cy.get('[data-item-id="101"] .qty-input').should('have.value', '5');
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').should('be.disabled');
    cy.get('[data-item-id="101"] .price-tag').should('contain', '500,00');

    // Subtotal: (5 * 100) + 50 = 550,00; Total: 550 + 20 = 570,00
    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should('contain', '550,00');
    cy.get('.summary-total span:nth-child(2)').should('contain', '570,00');

    // Decrementa 1 -> quantidade 4, o botão de incrementar volta a ficar habilitado
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').click();
    cy.get('[data-item-id="101"] .qty-input').should('have.value', '4');
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').should('not.be.disabled');
  });

  it('atualiza o contador total de peças no cabeçalho ao aumentar e diminuir múltiplos itens', () => {
    // Início: 1 casaco + 1 bota = 2 peças
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (2)');

    // Aumenta casaco (+2) -> total 4 peças
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (4)');

    // Aumenta bota (+1) -> total 5 peças
    cy.get('[data-item-id="102"] [data-acao="incrementar"]').click();
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (5)');

    // Diminui casaco (-1) -> total 4 peças
    cy.get('[data-item-id="101"] [data-acao="decrementar"]').click();
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (4)');
  });

  it('sincroniza as alterações locais via PUT na API ao prosseguir para o checkout', () => {
    cy.intercept('PUT', `${apiUrl}/carrinho/itens`, (req) => {
      expect(req.headers['x-usuario-id']).to.eq('42');
      expect(req.body.itens).to.deep.equal([
        { itemId: 101, quantidade: 3 },
        { itemId: 102, quantidade: 2 }
      ]);

      req.reply({
        statusCode: 200,
        body: {
          id: 1,
          quantidadeItens: 5,
          subtotal: 400.0,
          itens: [
            { ...itensCarrinho[0], quantidade: 3 },
            { ...itensCarrinho[1], quantidade: 2 }
          ]
        }
      });
    }).as('sincronizarCarrinho');

    // Incrementa item 101 para 3 e item 102 para 2
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('[data-item-id="101"] [data-acao="incrementar"]').click();
    cy.get('[data-item-id="102"] [data-acao="incrementar"]').click();

    cy.get('.btn-checkout-black').click();

    cy.wait('@sincronizarCarrinho');
    cy.location('pathname').should('contain', 'checkout.html');
  });
});
