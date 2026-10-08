describe('Login de administrador', () => {
  it('redireciona o administrador para o painel de pedidos', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/login', {
      statusCode: 200,
      body: { id: 1, nome: 'Admin', tipoUsuario: 1 }
    }).as('loginAdministrador')

    cy.visit('login.html')
    cy.get('#email').type('admin@example.com')
    cy.get('#password').type('SenhaAdmin123!')
    cy.get('#loginForm').submit()

    cy.wait('@loginAdministrador')
    cy.location('pathname').should('eq', '/frontend/admin/pedidos.html')
  })
})