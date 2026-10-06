/**
 * ===============================================================================
 * Teste E2E: Checkout Simples com Dados Salvos - Cliente
 * Arquivo: tests/cypress/e2e/checkout-simples-cliente.cy.js
 * ===============================================================================
 * Escopo:
 * - Carregamento automático de endereço principal e cartão previamente cadastrados
 * - Submissão do checkout simples (Happy Path)
 * - Validação da mensagem de sucesso e status EmProcessamento
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout simples com dados pré-cadastrados - Cliente', () => {
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
    complemento: 'Apto 4B',
    bairro: 'Jardim das Palmeiras',
    cidade: 'Mogi das Cruzes',
    estado: 'SP'
  };

  const cartaoPadrao = {
    id: 5,
    usuarioId: 42,
    ultimosDigitos: '1234',
    bandeira: 'Mastercard',
    mesValidade: 12,
    anoValidade: 2028,
    padrao: true
  };

  const contextoCheckout = {
    carrinho: {
      id: 1,
      quantidadeItens: 1,
      subtotal: 100.0,
      itens: [
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
        }
      ]
    },
    enderecoPrincipal: enderecoPadrao,
    valorFrete: 20.0,
    valorTotal: 120.0,
    cartoes: [cartaoPadrao]
  };

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: contextoCheckout
    }).as('carregarContexto');

    cy.visit('checkout.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carregarContexto');
  });

  it('carrega endereço principal e cartão vinculado automaticamente', () => {
    cy.get('#usar-existente').should('be.checked');
    cy.get('#endereco-info').should('contain', 'Rua das Flores, 123');
    cy.get('#resumo-subtotal').should('contain', '100,00');
    cy.get('#resumo-frete').should('contain', '20,00');
    cy.get('#resumo-total').should('contain', '120,00');

    // Valor do cartão pré-preenchido com o total
    cy.get('.input-valor-cartao[data-cartao-id="5"]').should('have.value', '120.00');
  });

  it('finaliza a compra com sucesso e registra o status EmProcessamento', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      expect(req.headers['x-usuario-id']).to.eq('42');
      expect(req.body.usuarioEnderecoId).to.eq(10);
      expect(req.body.cartoes).to.have.length(1);
      expect(req.body.cartoes[0].usuarioCartaoId).to.eq(5);
      expect(req.body.cartoes[0].valor).to.eq(120.0);

      req.reply({
        statusCode: 200,
        body: {
          id: 501,
          codigo: 'PED-501-SIMPLES',
          data: new Date().toISOString(),
          status: 'EmProcessamento',
          subtotal: 100.0,
          valorFrete: 20.0,
          valorAbatidoCupons: 0.0,
          valorTotal: 120.0,
          valorPagoCartoes: 120.0
        }
      });
    }).as('finalizarPedido');

    cy.get('.btn-submit').click();

    cy.wait('@finalizarPedido').its('response.body.status').should('eq', 'EmProcessamento');

    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-501-SIMPLES')
      .and('contain', 'Valor Final:')
      .and('contain', '120,00');
  });

  it('exibe o pedido com status Em Processamento no histórico de Meus Pedidos', () => {
    cy.intercept('GET', `${apiUrl}/pedidos*`, {
      statusCode: 200,
      body: [
        {
          id: 501,
          codigo: 'PED-501-SIMPLES',
          data: new Date().toISOString(),
          status: 'EmProcessamento',
          subtotal: 100.0,
          valorFrete: 20.0,
          valorAbatidoCupons: 0.0,
          valorTotal: 120.0,
          pagamentos: [
            {
              id: 1,
              valor: 120.0,
              metodo: 1,
              cartaoUltimosDigitos: '1234',
              cartaoBandeira: 'Mastercard'
            }
          ],
          produtosDoPedido: contextoCheckout.carrinho.itens
        }
      ]
    }).as('listarPedidos');

    cy.visit('pedidos.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@listarPedidos');
    cy.get('.order-card').should('be.visible');
    cy.get('.order-number').should('contain', 'PED-501-SIMPLES');
    cy.get('.status')
      .should('have.class', 'status-atencao')
      .and('contain', 'Em Processamento');
  });
});
