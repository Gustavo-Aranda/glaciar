describe('Inativar cadastro de Cliente (C)', () => {
  it('recusa o login de uma conta de cliente inativada', () => {
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

  it('inativa o cadastro do cliente e volta para o login', () => {
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
          email: 'maria@example.com',
          telefone: '11987654321'
        }))
      }
    })

    cy.get('#btn-inativar-conta').click()
    cy.get('#modal-inativar-conta').should('be.visible')
    cy.get('#btn-confirmar-inativacao').click()

    cy.wait('@inativarCliente').its('request.body').should('deep.equal', { ativo: false })
    cy.location('pathname').should('eq', '/frontend/user/login.html')
  })

  it('Inativar cadastro de Cliente (A)', () => {
    const cliente = {
      id: 42,
      nome: 'Maria',
      sobrenome: 'Silva',
      cpf: '52998224725',
      email: 'maria@example.com',
      telefone: '11987654321',
      tipoUsuario: 0,
      ativo: true,
      createdAt: '2026-01-10T00:00:00Z'
    }

    cy.intercept('GET', 'http://localhost:5205/api/conta', {
      statusCode: 200,
      body: [cliente]
    }).as('listarClientes')
    cy.intercept('PATCH', 'http://localhost:5205/api/conta/42/status', {
      statusCode: 200,
      body: { ...cliente, ativo: false }
    }).as('inativarClienteAdmin')

    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html')
    cy.wait('@listarClientes')
    cy.get('.btn-warning').first().click()
    cy.get('#modal-status-cliente').should('be.visible')
    cy.get('#btn-confirmar-status').click()

    cy.wait('@inativarClienteAdmin').its('request.body').should('deep.equal', { ativo: false })
    cy.get('#resultado-titulo').should('contain', 'Status atualizado')
  })
})