const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Login de cliente e administrador (API Real)', () => {
  let clienteReal;
  let adminReal;
  const idsCriados = [];

  before(() => {
    cy.criarClienteTesteReal({
      nome: 'Cliente',
      sobrenome: 'LoginQA',
      senha: 'SenhaLogin123'
    }).then((cli) => {
      clienteReal = cli;
      idsCriados.push(cli.id);
    });

    const cpfAdmin = Cypress.glaciar.gerarCpfValido(77);
    const emailAdmin = Cypress.glaciar.gerarEmailUnico('adm.login');
    const senhaAdmin = 'SenhaAdmin123';

    cy.request('POST', `${apiUrl}/conta/admin/registrar`, {
      nome: 'Admin',
      sobrenome: 'LoginQA',
      cpf: cpfAdmin,
      email: emailAdmin,
      telefone: '11987654321',
      senha: senhaAdmin,
      tipoUsuario: 1
    }).then((res) => {
      expect(res.status).to.eq(201);
      adminReal = { ...res.body, email: emailAdmin, senha: senhaAdmin };
      idsCriados.push(res.body.id);
    });
  });

  after(() => {
    idsCriados.reverse().forEach((id) => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${id}`,
        failOnStatusCode: false
      });
    });
  });

  beforeEach(() => {
    cy.visit('login.html');
  });

  it('informa quando as credenciais sao invalidas no backend real', () => {
    cy.intercept('POST', `${apiUrl}/conta/login`).as('loginCliente');

    cy.get('#email').type(clienteReal.email);
    cy.get('#password').type('senha-incorreta-999');
    cy.get('#loginForm').submit();

    cy.wait('@loginCliente').its('response.statusCode').should('eq', 401);
    cy.get('#mensagem-login')
      .should('be.visible')
      .and('contain', 'E-mail ou senha inválidos.');
  });

  it('informa erro ao tentar entrar sem preencher os dados', () => {
    cy.intercept('POST', `${apiUrl}/conta/login`).as('naoDeveLogar');

    cy.get('#loginForm').submit();

    cy.get('#mensagem-login')
      .should('be.visible')
      .and('contain', 'Informe seu e-mail e sua senha.');
    cy.get('@naoDeveLogar.all').should('have.length', 0);
  });

  it('autentica Cliente real com e-mail normalizado e redireciona para conta.html', () => {
    cy.intercept('POST', `${apiUrl}/conta/login`).as('loginUsuario');

    cy.get('#email').type(clienteReal.email.toUpperCase());
    cy.get('#password').type(clienteReal.senha);
    cy.get('#loginForm').submit();

    cy.wait('@loginUsuario').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        email: clienteReal.email,
        senha: clienteReal.senha
      });
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.location('pathname').should('eq', '/frontend/user/conta.html');
    cy.location('search').should('eq', `?id=${clienteReal.id}`);
  });

  it('autentica Administrador real com e-mail normalizado e redireciona para admin/pedidos.html', () => {
    cy.intercept('POST', `${apiUrl}/conta/login`).as('loginAdmin');

    cy.get('#email').type(adminReal.email.toUpperCase());
    cy.get('#password').type(adminReal.senha);
    cy.get('#loginForm').submit();

    cy.wait('@loginAdmin').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        email: adminReal.email,
        senha: adminReal.senha
      });
      expect(interception.response.statusCode).to.eq(200);
    });

    cy.location('pathname').should('eq', '/frontend/admin/pedidos.html');
  });
});
