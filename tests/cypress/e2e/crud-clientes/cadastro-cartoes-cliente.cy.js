const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Cadastro de cartões de crédito (C)', () => {
  let clienteTeste;
  let cartoesCriados = [];

  before(() => {
    // Valida presença de cliente ativo real e instancia cliente dedicado para testar carteira limpa na UI
    cy.obterClienteAtivoReal().its('id').should('be.a', 'number');
    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'CartoesUI' }).then((cli) => {
      clienteTeste = cli;
    });
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  beforeEach(() => {
    cartoesCriados = [];
    cy.intercept('GET', `${apiUrl}/pagamentos/contexto*`).as('obterContextoPagamentos');

    cy.visit(`pagamentos.html?id=${clienteTeste.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
      }
    });
    cy.wait('@obterContextoPagamentos').its('response.statusCode').should('eq', 200);
  });

  afterEach(() => {
    cartoesCriados.reverse().forEach((cartaoId) => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/cartoes/${clienteTeste.id}/${cartaoId}`,
        failOnStatusCode: false
      });
    });
    cartoesCriados = [];
  });

  it('associa diversos cartões reais ao cliente mantendo apenas um cartão preferencial no banco', () => {
    cy.intercept('POST', `${apiUrl}/cartoes`).as('cadastrarCartao');
    cy.intercept('GET', `${apiUrl}/cartoes/cliente/${clienteTeste.id}`).as('listarCartoes');

    cy.get('.btn-text-add').click();
    cy.get('#cartao-numero').type('5158376442285253');
    cy.get('#cartao-cvv').type('765');
    cy.get('#cartao-bandeira').select('Mastercard');
    cy.get('#cartao-mes').type('7');
    cy.get('#cartao-ano').type('2028');
    cy.get('#cartao-padrao').check();
    cy.get('#form-cartao').submit();

    cy.wait('@cadastrarCartao').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        usuarioId: clienteTeste.id,
        numero: '5158376442285253',
        cvv: '765',
        bandeira: 'Mastercard',
        mesValidade: 7,
        anoValidade: 2028,
        padrao: true
      });
      expect(interception.response.statusCode).to.eq(201);
      cartoesCriados.push(interception.response.body.id);
    });
    cy.wait('@listarCartoes');

    // Cadastra segundo cartão marcando também como padrão -> backend garante apenas 1 preferencial
    cy.get('.btn-text-add').click();
    cy.get('#cartao-numero').type('4916511493269188');
    cy.get('#cartao-cvv').type('690');
    cy.get('#cartao-bandeira').select('Visa');
    cy.get('#cartao-mes').type('11');
    cy.get('#cartao-ano').type('2028');
    cy.get('#cartao-padrao').check();
    cy.get('#form-cartao').submit();

    cy.wait('@cadastrarCartao').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        usuarioId: clienteTeste.id,
        numero: '4916511493269188',
        cvv: '690',
        bandeira: 'Visa',
        mesValidade: 11,
        anoValidade: 2028,
        padrao: true
      });
      expect(interception.response.statusCode).to.eq(201);
      cartoesCriados.push(interception.response.body.id);
    });
    cy.wait('@listarCartoes');

    cy.get('#lista-cartoes .wallet-item').should('have.length', 2);
    cy.get('#lista-cartoes')
      .should('contain', 'Cartão final 5253')
      .and('contain', 'Cartão final 9188');

    // Comprova no PostgreSQL que apenas 1 cartão permaneceu como preferencial (padrao: true)
    cy.request('GET', `${apiUrl}/cartoes/cliente/${clienteTeste.id}`).then((res) => {
      const preferenciais = res.body.filter((c) => c.padrao === true);
      expect(preferenciais).to.have.length(1);
      expect(preferenciais[0].ultimosDigitos).to.eq('9188');
    });
  });

  it('exibe erro real do backend ao cadastrar cartão com número inválido', () => {
    cy.intercept('POST', `${apiUrl}/cartoes`).as('cadastrarCartaoInvalido');

    cy.get('.btn-text-add').click();
    cy.get('#cartao-numero').type('5158376442285254');
    cy.get('#cartao-cvv').type('765');
    cy.get('#cartao-bandeira').select('Mastercard');
    cy.get('#cartao-mes').type('7');
    cy.get('#cartao-ano').type('2028');
    cy.get('#form-cartao').submit();

    cy.wait('@cadastrarCartaoInvalido').then((interception) => {
      expect(interception.request.body).to.include({
        usuarioId: clienteTeste.id,
        numero: '5158376442285254',
        cvv: '765'
      });
      expect(interception.response.statusCode).to.eq(400);
    });

    cy.get('#mensagem-cartao')
      .should('be.visible')
      .and('contain', 'O número do cartão é inválido.');
  });
});
