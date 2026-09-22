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

  it('redireciona o cliente autenticado para a conta', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/login', {
      statusCode: 200,
      body: { id: 42, nome: 'Maria', tipoUsuario: 0 }
    }).as('loginCliente')

    cy.get('#email').type('CLIENTE@EXAMPLE.COM')
    cy.get('#password').type('Senha123!')
    cy.get('#loginForm').submit()

    cy.wait('@loginCliente').its('request.body').should('deep.equal', {
      email: 'cliente@example.com',
      senha: 'Senha123!'
    })
    cy.location('pathname').should('eq', '/frontend/user/conta.html')
    cy.location('search').should('eq', '?id=42')
  })
})