const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Alterar Cliente (A)', () => {
  let clienteExistenteReferencia;
  let clienteTeste;

  before(() => {
    cy.obterClienteAtivoReal().then((cli) => {
      clienteExistenteReferencia = cli;
    });
  });

  beforeEach(() => {
    cy.criarClienteTesteReal({
      nome: 'Maria',
      sobrenome: 'Silva',
      telefone: '11987654321'
    }).then((criado) => {
      clienteTeste = criado;

      cy.intercept('GET', `${apiUrl}/conta`).as('listarClientes');
      cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html');
      cy.wait('@listarClientes').its('response.statusCode').should('eq', 200);

      cy.contains('article.admin-card', clienteTeste.email)
        .find('.btn-edit-client')
        .click();

      cy.get('#modal-editar-cliente').should('be.visible');
      cy.get('#editar-tipoUsuario').select('0');
    });
  });

  afterEach(() => {
    if (clienteTeste?.id) {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${clienteTeste.id}`,
        failOnStatusCode: false
      });
      clienteTeste = null;
    }
  });

  it('altera os dados cadastrais do cliente no banco real', () => {
    const novoEmail = Cypress.glaciar.gerarEmailUnico('mariana.admin.edit');
    cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}`).as('editarCliente');

    cy.get('#editar-nome').clear().type('Mariana');
    cy.get('#editar-email').clear().type(novoEmail);
    cy.get('#editar-telefone').clear().type('11876543210');
    cy.get('#form-editar-cliente').submit();

    cy.wait('@editarCliente').then((interception) => {
      expect(interception.request.body).to.deep.include({
        nome: 'Mariana',
        sobrenome: 'Silva',
        cpf: clienteTeste.cpf,
        email: novoEmail,
        telefone: '11876543210',
        tipoUsuario: 0
      });
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.get('#modal-resultado').should('be.visible');
    cy.get('#resultado-titulo').should('contain', 'Cliente atualizado');

    cy.request('GET', `${apiUrl}/conta/${clienteTeste.id}`).then((res) => {
      expect(res.body.nome).to.eq('Mariana');
      expect(res.body.email).to.eq(novoEmail);
    });
  });

  it('informa erro ao tentar salvar sem preencher os dados', () => {
    cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}`).as('naoDeveEditarCliente');

    cy.get('#editar-nome').clear();
    cy.get('#editar-sobrenome').clear();
    cy.get('#editar-cpf').clear();
    cy.get('#editar-email').clear();
    cy.get('#form-editar-cliente').submit();

    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'Preencha os campos corretamente');
    cy.get('@naoDeveEditarCliente.all').should('have.length', 0);
  });

  it('informa erro real do backend ao trocar o CPF por outro ja cadastrado', () => {
    cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}`).as('editarCliente');

    cy.get('#editar-cpf').clear().type(clienteExistenteReferencia.cpf);
    cy.get('#form-editar-cliente').submit();

    cy.wait('@editarCliente').its('response.statusCode').should('eq', 400);
    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'CPF já cadastrado');
  });

  it('informa erro real do backend ao trocar o email por outro ja cadastrado', () => {
    cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}`).as('editarCliente');

    cy.get('#editar-email').clear().type(clienteExistenteReferencia.email);
    cy.get('#form-editar-cliente').submit();

    cy.wait('@editarCliente').its('response.statusCode').should('eq', 400);
    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'Email já cadastrado');
  });

  it('informa erro ao tentar salvar um CPF invalido', () => {
    cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}`).as('naoDeveEditarCliente');

    cy.get('#editar-cpf').clear().type('11111111111');
    cy.get('#form-editar-cliente').submit();

    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'informe um CPF válido');
    cy.get('@naoDeveEditarCliente.all').should('have.length', 0);
  });
});
