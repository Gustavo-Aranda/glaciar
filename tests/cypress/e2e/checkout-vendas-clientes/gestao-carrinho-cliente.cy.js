/**
 * ===============================================================================
 * Teste E2E: Gestão do Carrinho de Compras - Cliente (100% Backend Real)
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/gestao-carrinho-cliente.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

describe('Gestão do carrinho de compras - Cliente (API Real)', () => {
  let clienteTeste;
  let sku1;
  let sku2;
  let contextoReal;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 6 }).then((res1) => {
      sku1 = res1;
      return cy
        .obterSkuComEstoqueReal({
          minEstoque: 6,
          excluirProdutoIds: [res1.produto.id],
          excluirEstoqueIds: [res1.estoque.id]
        })
        .then((res2) => {
          sku2 = res2;
        });
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'CarrinhoReal' }).then((cli) => {
      clienteTeste = cli;
      return cy.criarEnderecoReal(cli.id, { estado: 'PR', padrao: true });
    });
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  beforeEach(() => {
    cy.esvaziarCarrinhoReal(clienteTeste.id)
      .then(() => cy.adicionarItemCarrinhoReal(clienteTeste.id, sku1.estoque.id, 1))
      .then(() => cy.adicionarItemCarrinhoReal(clienteTeste.id, sku2.estoque.id, 1))
      .then(() => {
        cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carregarContexto');

        cy.visit(`carrinho.html?id=${clienteTeste.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
          }
        });

        cy.wait('@carregarContexto').then((interception) => {
          expect(interception.response.statusCode).to.eq(200);
          contextoReal = interception.response.body;
        });
      });
  });

  afterEach(() => {
    if (clienteTeste?.id) {
      cy.esvaziarCarrinhoReal(clienteTeste.id);
    }
  });

  it('lista múltiplos itens reais do PostgreSQL com seus preços, frete e totais', () => {
    const [item1, item2] = contextoReal.carrinho.itens;

    cy.get('.cart-items-section').should('be.visible');
    cy.get(`[data-item-id="${item1.id}"]`).should('contain', item1.nomeProduto);
    cy.get(`[data-item-id="${item2.id}"]`).should('contain', item2.nomeProduto);

    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should(
      'contain',
      formatarBRL(contextoReal.carrinho.subtotal)
    );
    cy.get('.summary-details .summary-line:nth-child(2) span:nth-child(2)').should(
      'contain',
      formatarBRL(contextoReal.valorFrete)
    );
    cy.get('.summary-total span:nth-child(2)').should(
      'contain',
      formatarBRL(contextoReal.valorTotal)
    );
  });

  it('incrementa e decrementa quantidades recalculando visualmente os subtotais e total', () => {
    const [item1, item2] = contextoReal.carrinho.itens;
    const frete = Number(contextoReal.valorFrete);

    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] .qty-input`).should('have.value', '2');
    cy.get(`[data-item-id="${item1.id}"] .price-tag`).should(
      'contain',
      formatarBRL(item1.precoUnitario * 2)
    );

    const novoSubtotal = item1.precoUnitario * 2 + item2.precoUnitario;
    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should(
      'contain',
      formatarBRL(novoSubtotal)
    );
    cy.get('.summary-total span:nth-child(2)').should(
      'contain',
      formatarBRL(novoSubtotal + frete)
    );

    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] .qty-input`).should('have.value', '1');
    cy.get(`[data-item-id="${item1.id}"] .price-tag`).should(
      'contain',
      formatarBRL(item1.precoUnitario)
    );
  });

  it('desabilita botão de decrementar quando a quantidade for 1 (limite mínimo)', () => {
    const [item1] = contextoReal.carrinho.itens;

    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).should('be.disabled');

    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] .qty-input`).should('have.value', '2');
    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).should('not.be.disabled');

    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] .qty-input`).should('have.value', '1');
    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).should('be.disabled');
  });

  it('desabilita botão de incrementar ao atingir o estoque físico disponível real', () => {
    const [item1, item2] = contextoReal.carrinho.itens;
    const limiteEstoque = item1.estoqueDisponivel;
    const frete = Number(contextoReal.valorFrete);

    for (let i = 1; i < limiteEstoque; i += 1) {
      cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    }

    cy.get(`[data-item-id="${item1.id}"] .qty-input`).should('have.value', String(limiteEstoque));
    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).should('be.disabled');
    cy.get(`[data-item-id="${item1.id}"] .price-tag`).should(
      'contain',
      formatarBRL(item1.precoUnitario * limiteEstoque)
    );

    const subtotalMax = item1.precoUnitario * limiteEstoque + item2.precoUnitario;
    cy.get('.summary-details .summary-line:nth-child(1) span:nth-child(2)').should(
      'contain',
      formatarBRL(subtotalMax)
    );
    cy.get('.summary-total span:nth-child(2)').should('contain', formatarBRL(subtotalMax + frete));

    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] .qty-input`).should(
      'have.value',
      String(limiteEstoque - 1)
    );
    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).should('not.be.disabled');
  });

  it('atualiza o contador total de peças no cabeçalho ao aumentar e diminuir múltiplos itens', () => {
    const [item1, item2] = contextoReal.carrinho.itens;

    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (2)');

    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (4)');

    cy.get(`[data-item-id="${item2.id}"] [data-acao="incrementar"]`).click();
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (5)');

    cy.get(`[data-item-id="${item1.id}"] [data-acao="decrementar"]`).click();
    cy.get('.cart-table-header .th-product').should('contain', 'Meu carrinho (4)');
  });

  it('sincroniza as alterações locais via PUT real na API ao prosseguir para o checkout', () => {
    const [item1, item2] = contextoReal.carrinho.itens;
    cy.intercept('PUT', `${apiUrl}/carrinho/itens`).as('sincronizarCarrinho');

    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    cy.get(`[data-item-id="${item1.id}"] [data-acao="incrementar"]`).click();
    cy.get(`[data-item-id="${item2.id}"] [data-acao="incrementar"]`).click();

    cy.get('.btn-checkout-black').click();

    cy.wait('@sincronizarCarrinho').then((interception) => {
      expect(interception.request.headers['x-usuario-id']).to.eq(String(clienteTeste.id));
      expect(interception.request.body.itens).to.deep.equal([
        { itemId: item1.id, quantidade: 3 },
        { itemId: item2.id, quantidade: 2 }
      ]);
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.quantidadeItens).to.eq(5);
    });

    cy.location('pathname').should('contain', 'checkout.html');
  });
});
