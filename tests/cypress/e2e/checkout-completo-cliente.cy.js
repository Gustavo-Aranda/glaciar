/**
 * ===============================================================================
 * Teste E2E: Checkout Completo com Novos Dados - Cliente
 * Arquivo: tests/cypress/e2e/checkout-completo-cliente.cy.js
 * ===============================================================================
 * Escopo:
 * - Validação preventiva de formulário em branco (Unhappy Path)
 * - Cadastro de novo endereço com opção de salvar no perfil
 * - Cadastro de novo cartão de crédito com opção de salvar no perfil
 * - Finalização com sucesso e confirmação do payload e status EmProcessamento
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout completo com novos dados cadastrais - Cliente', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria.silva@example.com'
  };

  const contextoSemDados = {
    carrinho: {
      id: 1,
      quantidadeItens: 1,
      subtotal: 150.0,
      itens: [
        {
          id: 101,
          nomeProduto: 'Casaco Polar Térmico',
          tamanho: 'G',
          cor: 'Preto',
          sku: 'CAS-POL-G-PRT',
          precoUnitario: 150.0,
          quantidade: 1,
          estoqueDisponivel: 5,
          disponivel: true
        }
      ]
    },
    enderecoPrincipal: null,
    cartoes: [],
    valorFrete: 20.0,
    valorTotal: 170.0
  };

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: contextoSemDados
    }).as('carregarContexto');

    cy.visit('checkout.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carregarContexto');
  });

  it('valida campos obrigatórios ao tentar submeter endereço incompleto (Unhappy Path)', () => {
    // Tenta finalizar compra com campos em branco
    cy.get('.btn-submit').click();

    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios do novo endereço.');
  });

  it('cadastra novo endereço e novo cartão marcando para salvar no perfil (Happy Path)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      // Validação de salvamento do endereço no perfil
      expect(req.body.novoEndereco).to.not.be.null;
      expect(req.body.novoEndereco.logradouro).to.eq('Av. Paulista');
      expect(req.body.novoEndereco.numero).to.eq('1000');
      expect(req.body.novoEndereco.bairro).to.eq('Bela Vista');
      expect(req.body.novoEndereco.cidade).to.eq('São Paulo');
      expect(req.body.novoEndereco.estado).to.eq('SP');
      expect(req.body.novoEndereco.cep).to.eq('01310100');
      expect(req.body.novoEndereco.salvarNoPerfil).to.be.true;
      expect(req.body.novoEndereco.apelido).to.eq('Escritório');

      // Validação de salvamento do cartão no perfil
      expect(req.body.cartoes).to.have.length(1);
      const cartao = req.body.cartoes[0];
      expect(cartao.novoCartao.bandeira).to.eq('Visa');
      expect(cartao.novoCartao.numero).to.eq('4916511493269188');
      expect(cartao.novoCartao.mesValidade).to.eq(11);
      expect(cartao.novoCartao.anoValidade).to.eq(2028);
      expect(cartao.novoCartao.cvv).to.eq('123');
      expect(cartao.novoCartao.salvarNoPerfil).to.be.true;
      expect(cartao.valor).to.eq(170.0);

      req.reply({
        statusCode: 200,
        body: {
          id: 601,
          codigo: 'PED-601-NOVODADOS',
          status: 'EmProcessamento',
          subtotal: 150.0,
          valorFrete: 20.0,
          valorTotal: 170.0
        }
      });
    }).as('finalizarComNovosDados');

    // Preenche Novo Endereço
    cy.get('#novo-endereco-form').should('have.class', 'active');
    cy.get('#logradouro').type('Av. Paulista');
    cy.get('#numero').type('1000');
    cy.get('#bairro').type('Bela Vista');
    cy.get('#cidade').type('São Paulo');
    cy.get('#estado').select('SP');
    cy.get('#cep').type('01310100');
    cy.get('#salvar-perfil').check();
    cy.get('#apelido').type('Escritório');

    // Preenche Novo Cartão
    cy.get('#novo-cartao-form').should('have.class', 'active');
    cy.get('#cartao-nome').type('Maria Silva');
    cy.get('#cartao-bandeira').select('Visa');
    cy.get('#cartao-numero').type('4916 5114 9326 9188');
    cy.get('#cartao-mes').type('11');
    cy.get('#cartao-ano').type('2028');
    cy.get('#cartao-cvv').type('123');
    cy.get('#novo-cartao-valor').clear().type('170.00');
    cy.get('#save-card').check();

    cy.get('.btn-submit').click();

    cy.wait('@finalizarComNovosDados').its('response.body.status').should('eq', 'EmProcessamento');

    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-601-NOVODADOS')
      .and('contain', '170,00');
  });
});
