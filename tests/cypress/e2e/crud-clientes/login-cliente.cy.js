describe('Login de cliente', () => {
  beforeEach(() => {
    cy.visit('login.html')
  })

  it('informa quando as credenciais sao invalidas', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/login', {
      statusCode: 401,
      body: { erro: 'E-mail ou senha inválidos.' }
    }).as('loginCliente')

    cy.get('#email').type('cliente@example.com')
    cy.get('#password').type('senha-incorreta')
    cy.get('#loginForm').submit()

    cy.wait('@loginCliente')
    cy.get('#mensagem-login')
      .should('be.visible')
      .and('contain', 'E-mail ou senha inválidos.')
  })

  it('informa erro ao tentar entrar sem preencher os dados', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/login').as('naoDeveLogar')

    cy.get('#loginForm').submit()

    cy.get('#mensagem-login')
      .should('be.visible')
      .and('contain', 'Informe seu e-mail e sua senha.')
    cy.get('@naoDeveLogar.all').should('have.length', 0)
  })

  const perfisUsuario = [
    {
      papel: 'Cliente',
      email: 'CLIENTE@EXAMPLE.COM',
      emailNormalizado: 'cliente@example.com',
      senha: 'Senha123!',
      bodyMock: { id: 42, nome: 'Maria', tipoUsuario: 0 },
      rotaEsperada: '/frontend/user/conta.html',
      queryEsperada: '?id=42'
    },
    {
      papel: 'Administrador',
      email: 'ADMIN@GLACIAR.COM',
      emailNormalizado: 'admin@glaciar.com',
      senha: 'SenhaAdmin123!',
      bodyMock: { id: 1, nome: 'Admin', tipoUsuario: 1 },
      rotaEsperada: '/frontend/admin/pedidos.html',
      queryEsperada: ''
    }
  ];

  perfisUsuario.forEach(({ papel, email, emailNormalizado, senha, bodyMock, rotaEsperada, queryEsperada }) => {
    it(`autentica e redireciona ${papel} para a rota correta`, () => {
      cy.intercept('POST', 'http://localhost:5205/api/conta/login', {
        statusCode: 200,
        body: bodyMock
      }).as('loginUsuario');

      cy.get('#email').type(email);
      cy.get('#password').type(senha);
      cy.get('#loginForm').submit();

      cy.wait('@loginUsuario').its('request.body').should('deep.equal', {
        email: emailNormalizado,
        senha
      });
      cy.location('pathname').should('eq', rotaEsperada);
      if (queryEsperada) {
        cy.location('search').should('eq', queryEsperada);
      }
    });
  });
});