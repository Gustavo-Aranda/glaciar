describe('Inativacao de cliente', () => {
  it('recusa o login de uma conta inativada', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/login', {
      statusCode: 401,
      body: { erro: 'Esta conta está inativada. Entre em contato com o suporte.' }
    }).as('loginContaInativada')

    cy.visit('login.html')
    cy.get('#email').type('maria@example.com')
    cy.get('#password').type('Senha123!')
    cy.get('#loginForm').submit()

    cy.wait('@loginContaInativada')
    cy.get('#mensagem-login')
      .should('be.visible')
      .and('contain', 'Esta conta está inativada. Entre em contato com o suporte.')
    cy.location('pathname').should('eq', '/frontend/user/login.html')
  })

  it('confirma a inativacao da conta e volta para o login', () => {
    cy.intercept('PATCH', 'http://localhost:5205/api/conta/42/status', {
      statusCode: 200,
      body: { id: 42, ativo: false }
    }).as('inativarCliente')

    cy.visit('editar-perfil.html?id=42', {
      onBeforeLoad(window) {
        window.sessionStorage.setItem('usuarioLogado', JSON.stringify({
          id: 42,
          nome: 'Maria',
          sobrenome: 'Silva',
          email: 'maria@example.com'
        }))
      }
    })

    cy.get('#btn-inativar-conta').click()
    cy.get('#modal-inativar-conta').should('be.visible')
    cy.get('#btn-confirmar-inativacao').click()

    cy.wait('@inativarCliente').its('request.body').should('deep.equal', { ativo: false })
    cy.location('pathname').should('eq', '/frontend/user/login.html')
  })
})