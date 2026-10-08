describe('Cadastrar Cliente (A)', () => {
  beforeEach(() => {
    cy.intercept('GET', 'http://localhost:5205/api/conta', {
      statusCode: 200,
      body: []
    }).as('listarClientes')

    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html')
    cy.wait('@listarClientes')
    cy.get('#btn-novo-cliente').click()
    cy.get('#modal-criar-cliente').should('be.visible')
  })

  it('cria um cliente com telefone normalizado', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/admin/registrar', {
      statusCode: 201,
      body: { id: 43 }
    }).as('registrarClienteAdmin')

    cy.get('#nome').type('maria')
    cy.get('#sobrenome').type('da silva')
    cy.get('#cpf').type('62500851060')
    cy.get('#email').type('maria.silva@example.com')
    cy.get('#telefone').type('11987654321')
    cy.get('#tipoUsuario').select('0')
    cy.get('#senha').type('Senha123!')
    cy.get('#form-criar-cliente').submit()

    cy.wait('@registrarClienteAdmin').its('request.body').should('deep.equal', {
      nome: 'Maria',
      sobrenome: 'Da Silva',
      cpf: '62500851060',
      email: 'maria.silva@example.com',
      telefone: '11987654321',
      senha: 'Senha123!',
      tipoUsuario: 0
    })
  })

  it('recusa cadastro com telefone inválido', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/admin/registrar').as('naoDeveCadastrar')

    cy.get('#nome').type('Maria')
    cy.get('#sobrenome').type('Silva')
    cy.get('#cpf').type('62500851060')
    cy.get('#email').type('maria.silva@example.com')
    cy.get('#telefone').type('119')
    cy.get('#senha').type('Senha123!')
    cy.get('#form-criar-cliente').submit()

    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'Informe um telefone válido com DDD.')
    cy.get('@naoDeveCadastrar.all').should('have.length', 0)
  })
})
