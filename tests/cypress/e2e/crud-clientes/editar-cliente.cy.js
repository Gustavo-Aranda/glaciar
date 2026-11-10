const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Alterar Cliente (C)', () => {
  let clienteExistenteOutro;
  let clienteTeste;

  before(() => {
    cy.obterClienteAtivoReal().then((cli) => {
      clienteExistenteOutro = cli;
    });
  });

  beforeEach(() => {
    cy.criarClienteTesteReal({
      nome: 'Maria',
      sobrenome: 'Silva',
      telefone: '11987654321'
    }).then((criado) => {
      clienteTeste = criado;
      cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}/perfil`).as('atualizarPerfil');

      cy.visit(`editar-perfil.html?id=${clienteTeste.id}`, {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
          win.mostrarLoadingUsuario = () => {};
          win.esconderLoadingUsuario = () => {};
        }
      });
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
    const novoEmail = Cypress.glaciar.gerarEmailUnico('mariana.edit');

    cy.get('#nome').clear().type('Mariana');
    cy.get('#email').clear().type(novoEmail);
    cy.get('#telefone').clear().type('11876543210');
    cy.get('#form-editar-perfil').submit();

    cy.wait('@atualizarPerfil').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        nome: 'Mariana',
        sobrenome: 'Silva',
        email: novoEmail,
        telefone: '11876543210',
        senha: ''
      });
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.get('#mensagem-editar-perfil')
      .should('be.visible')
      .and('contain', 'Dados atualizados com sucesso.');

    cy.request('GET', `${apiUrl}/conta/${clienteTeste.id}`).then((res) => {
      expect(res.body.nome).to.eq('Mariana');
      expect(res.body.email).to.eq(novoEmail);
      expect(res.body.telefone).to.eq('11876543210');
    });
  });

  it('Alteração apenas da senha (C) validando login posterior na API real', () => {
    cy.get('#senha').type('NovaSenha123');
    cy.get('#form-editar-perfil').submit();

    cy.wait('@atualizarPerfil').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        nome: 'Maria',
        sobrenome: 'Silva',
        email: clienteTeste.email,
        telefone: '11987654321',
        senha: 'NovaSenha123'
      });
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.request('POST', `${apiUrl}/conta/login`, {
      email: clienteTeste.email,
      senha: 'NovaSenha123'
    }).its('status').should('eq', 200);
  });

  it('exibe erro ao tentar salvar sem preencher os dados obrigatorios', () => {
    cy.intercept('PUT', `${apiUrl}/conta/${clienteTeste.id}/perfil`).as('naoDeveAtualizarPerfil');

    cy.get('#nome').clear();
    cy.get('#sobrenome').clear();
    cy.get('#email').clear();
    cy.get('#telefone').clear();
    cy.get('#form-editar-perfil').submit();

    cy.get('#mensagem-editar-perfil')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios.');
    cy.get('@naoDeveAtualizarPerfil.all').should('have.length', 0);
  });

  it('exibe erro real do backend ao trocar o email por outro ja cadastrado', () => {
    cy.get('#email').clear().type(clienteExistenteOutro.email);
    cy.get('#form-editar-perfil').submit();

    cy.wait('@atualizarPerfil').its('response.statusCode').should('eq', 400);
    cy.get('#mensagem-editar-perfil')
      .should('be.visible')
      .and('contain', 'Email já cadastrado');
  });
});
