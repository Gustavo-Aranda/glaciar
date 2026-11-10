/**
 * ===============================================================================
 * Teste E2E: Checkout Completo com Novos Dados - Cliente (100% Backend Real)
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-completo-cliente.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

describe('Checkout completo com novos dados cadastrais - Cliente (API Real)', () => {
  let clienteTeste;
  let skuReal;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 5 }).then((res) => {
      skuReal = res;
    });
  });

  beforeEach(() => {
    // Cria um cliente real sem endereço e sem cartões salvos para acionar os formulários de novos dados
    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'CheckoutCompleto' }).then((cli) => {
      clienteTeste = cli;
      return cy.adicionarItemCarrinhoReal(cli.id, skuReal.estoque.id, 1);
    }).then(() => {
      cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carregarContexto');

      cy.visit(`checkout.html?id=${clienteTeste.id}`, {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
        }
      });

      cy.wait('@carregarContexto').its('response.statusCode').should('eq', 200);
    });
  });

  afterEach(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
      clienteTeste = null;
    }
  });

  it('valida campos obrigatórios ao tentar submeter endereço incompleto (Unhappy Path)', () => {
    cy.get('.btn-submit').click();

    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios do novo endereço.');
  });

  it('cadastra novo endereço e novo cartão marcando para salvar no perfil e persiste no banco (Happy Path)', () => {
    cy.intercept('GET', `${apiUrl}/carrinho/frete/SP`).as('freteSP');
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarComNovosDados');

    cy.get('#novo-endereco-form').should('have.class', 'active');
    cy.get('#logradouro').type('Av. Paulista');
    cy.get('#numero').type('1000');
    cy.get('#bairro').type('Bela Vista');
    cy.get('#cidade').type('São Paulo');
    cy.get('#estado').select('SP');
    cy.wait('@freteSP').its('response.statusCode').should('eq', 200);

    cy.get('#cep').type('01310100');
    cy.get('#salvar-perfil').check();
    cy.get('#apelido').type('Escritório');

    // Captura o valor total exato calculado pelo backend (subtotal do produto real + R$ 15,00 frete SP)
    const totalEsperado = Number(skuReal.produto.preco) + 15.0;

    cy.get('#novo-cartao-form').should('have.class', 'active');
    cy.get('#cartao-nome').type('Maria Silva');
    cy.get('#cartao-bandeira').select('Visa');
    cy.get('#cartao-numero').type('4916 5114 9326 9188');
    cy.get('#cartao-mes').type('11');
    cy.get('#cartao-ano').type('2028');
    cy.get('#cartao-cvv').type('690');
    cy.get('#novo-cartao-valor').clear().type(totalEsperado.toFixed(2));
    cy.get('#save-card').check();

    cy.get('.btn-submit').click();

    cy.wait('@finalizarComNovosDados').then((interception) => {
      expect(interception.request.body.novoEndereco).to.include({
        logradouro: 'Av. Paulista',
        numero: '1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01310100',
        salvarNoPerfil: true,
        apelido: 'Escritório'
      });

      expect(interception.request.body.cartoes).to.have.length(1);
      const cartaoReq = interception.request.body.cartoes[0];
      expect(cartaoReq.novoCartao).to.include({
        bandeira: 'Visa',
        numero: '4916511493269188',
        mesValidade: 11,
        anoValidade: 2028,
        cvv: '690',
        salvarNoPerfil: true
      });
      expect(cartaoReq.valor).to.eq(totalEsperado);

      expect(interception.response.statusCode).to.eq(200);
      const pedido = interception.response.body;
      expect(pedido.status).to.eq('EmProcessamento');

      cy.get('.checkout-main')
        .should('contain', 'Compra finalizada com sucesso!')
        .and('contain', pedido.codigo)
        .and('contain', formatarBRL(totalEsperado));

      // Comprova que endereço e cartão foram realmente salvos no perfil do cliente no PostgreSQL
      cy.request('GET', `${apiUrl}/enderecos/cliente/${clienteTeste.id}`).then((resEnd) => {
        expect(resEnd.body.some((e) => (e.apelido || e.Apelido) === 'Escritório')).to.be.true;
      });
      cy.request('GET', `${apiUrl}/cartoes/cliente/${clienteTeste.id}`).then((resCart) => {
        expect(resCart.body.some((c) => c.ultimosDigitos === '9188')).to.be.true;
      });
    });
  });
});
