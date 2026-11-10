const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Cadastrar Cliente (A)', () => {
  let usuariosCriados = [];

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/conta`).as('listarClientes');

    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html');
    cy.wait('@listarClientes').its('response.statusCode').should('eq', 200);
    cy.get('#btn-novo-cliente').click();
    cy.get('#modal-criar-cliente').should('be.visible');
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

  it('cria um cliente real pelo painel admin com telefone e nome normalizados', () => {
    const cpf = Cypress.glaciar.gerarCpfValido(40);
    const email = Cypress.glaciar.gerarEmailUnico('admin.create');

    cy.intercept('POST', `${apiUrl}/conta/admin/registrar`).as('registrarClienteAdmin');

    cy.get('#nome').type('maria');
    cy.get('#sobrenome').type('da silva');
    cy.get('#cpf').type(cpf);
    cy.get('#email').type(email);
    cy.get('#telefone').type('(11) 98765-4321');
    cy.get('#tipoUsuario').select('0');
    cy.get('#senha').type('Senha123!');
    cy.get('#form-criar-cliente').submit();

    cy.wait('@registrarClienteAdmin').then((interception) => {
      if (interception.response?.body?.id) {
        usuariosCriados.push(interception.response.body.id);
      }
      expect(interception.request.body).to.deep.equal({
        nome: 'Maria',
        sobrenome: 'Da Silva',
        cpf,
        email,
        telefone: '11987654321',
        senha: 'Senha123!',
        tipoUsuario: 0
      });
      expect(interception.response.statusCode).to.eq(201);

      cy.request('GET', `${apiUrl}/conta/${interception.response.body.id}`).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.email).to.eq(email);
        expect(res.body.telefone).to.eq('11987654321');
      });
    });
  });

  it('recusa cadastro com telefone inválido sem disparar requisição', () => {
    cy.intercept('POST', `${apiUrl}/conta/admin/registrar`).as('naoDeveCadastrar');

    cy.get('#nome').type('Maria');
    cy.get('#sobrenome').type('Silva');
    cy.get('#cpf').type(Cypress.glaciar.gerarCpfValido(41));
    cy.get('#email').type(Cypress.glaciar.gerarEmailUnico('tel.invalido'));
    cy.get('#telefone').type('119');
    cy.get('#senha').type('Senha123!');
    cy.get('#form-criar-cliente').submit();

    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'Informe um telefone válido com DDD.');
    cy.get('@naoDeveCadastrar.all').should('have.length', 0);
  });
});
