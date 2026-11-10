const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Cadastrar Cliente (C)', () => {
  let clienteBaseExistente;
  let usuariosCriados = [];

  before(() => {
    cy.obterClienteAtivoReal().then((cliente) => {
      clienteBaseExistente = cliente;
    });
  });

  beforeEach(() => {
    cy.visit('cadastro.html');
  });

  afterEach(() => {
    usuariosCriados.reverse().forEach((id) => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${id}`,
        failOnStatusCode: false
      });
    });
    usuariosCriados = [];
  });

  it('exibe erro quando o CPF informado e invalido', () => {
    cy.get('#nome').type('Maria');
    cy.get('#sobrenome').type('Silva');
    cy.get('#cpf').type('11111111111');
    cy.get('#email').type(Cypress.glaciar.gerarEmailUnico('cpf.invalido'));
    cy.get('#telefone').type('11987654321');
    cy.get('#senha').type('Senha123!');

    cy.get('#form-registrar-cliente').submit();

    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Informe um CPF válido.');
  });

  it('cadastra um cliente real no PostgreSQL com os dados normalizados', () => {
    const cpfNovo = Cypress.glaciar.gerarCpfValido(10);
    const emailMin = Cypress.glaciar.gerarEmailUnico('maria.norm');
    const emailUpper = emailMin.toUpperCase();

    cy.intercept('POST', `${apiUrl}/conta/registrar`).as('registrarCliente');

    cy.get('#nome').type('maria');
    cy.get('#sobrenome').type('da silva');
    cy.get('#cpf').type(cpfNovo);
    cy.get('#email').type(emailUpper);
    cy.get('#telefone').type('11987654321');
    cy.get('#senha').type('Senha123!');
    cy.get('#form-registrar-cliente').submit();

    cy.wait('@registrarCliente').then((interception) => {
      if (interception.response?.body?.id) {
        usuariosCriados.push(interception.response.body.id);
      }
      expect(interception.request.body).to.deep.equal({
        nome: 'Maria',
        sobrenome: 'Da Silva',
        cpf: cpfNovo,
        email: emailMin,
        telefone: '11987654321',
        senha: 'Senha123!'
      });
      expect(interception.response.statusCode).to.eq(201);
      const novoId = interception.response.body.id;
      expect(novoId).to.be.a('number');

      cy.request('GET', `${apiUrl}/conta/${novoId}`).then((consulta) => {
        expect(consulta.status).to.eq(200);
        expect(consulta.body.email).to.eq(emailMin);
        expect(consulta.body.cpf).to.eq(cpfNovo);
        expect(consulta.body.ativo).to.be.true;
      });
    });

    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Conta criada com sucesso.');
  });

  it('exibe erro ao tentar cadastrar sem preencher os dados obrigatorios', () => {
    cy.intercept('POST', `${apiUrl}/conta/registrar`).as('naoDeveCadastrar');

    cy.get('#form-registrar-cliente').submit();

    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios.');
    cy.get('@naoDeveCadastrar.all').should('have.length', 0);
  });

  it('exibe erro real do backend ao cadastrar um CPF ja cadastrado', () => {
    cy.intercept('POST', `${apiUrl}/conta/registrar`).as('registrarCliente');

    cy.get('#nome').type('Joao');
    cy.get('#sobrenome').type('Souza');
    cy.get('#cpf').type(clienteBaseExistente.cpf);
    cy.get('#email').type(Cypress.glaciar.gerarEmailUnico('cpf.dup'));
    cy.get('#telefone').type('11987654321');
    cy.get('#senha').type('Senha123!');
    cy.get('#form-registrar-cliente').submit();

    cy.wait('@registrarCliente').its('response.statusCode').should('eq', 400);
    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'CPF já cadastrado');
  });

  it('exibe erro real do backend ao cadastrar um email ja cadastrado', () => {
    cy.intercept('POST', `${apiUrl}/conta/registrar`).as('registrarCliente');

    cy.get('#nome').type('Joao');
    cy.get('#sobrenome').type('Souza');
    cy.get('#cpf').type(Cypress.glaciar.gerarCpfValido(25));
    cy.get('#email').type(clienteBaseExistente.email);
    cy.get('#telefone').type('11987654321');
    cy.get('#senha').type('Senha123!');
    cy.get('#form-registrar-cliente').submit();

    cy.wait('@registrarCliente').its('response.statusCode').should('eq', 400);
    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Email já cadastrado');
  });
});
