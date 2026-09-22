describe('Edicao de cliente pelo administrador', () => {
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

  beforeEach(() => {
    cy.intercept('GET', 'http://localhost:5205/api/conta', {
      statusCode: 200,
      body: [cliente]
    }).as('listarClientes')

    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html')
    cy.wait('@listarClientes')
    cy.get('.btn-edit-client').click()
    cy.get('#modal-editar-cliente').should('be.visible')
  })

  it('atualiza os dados do cliente pelo modal de edicao', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42', {
      statusCode: 200,
      body: { ...cliente, nome: 'Mariana', email: 'mariana@example.com' }
    }).as('editarCliente')

    cy.get('#editar-nome').clear().type('Mariana')
    cy.get('#editar-email').clear().type('mariana@example.com')
    cy.get('#form-editar-cliente').submit()

    cy.wait('@editarCliente').its('request.body').should('deep.include', {
      nome: 'Mariana',
      sobrenome: 'Silva',
      cpf: '52998224725',
      email: 'mariana@example.com',
      telefone: '11987654321',
      tipoUsuario: 0
    })
    cy.get('#modal-resultado').should('be.visible')
    cy.get('#resultado-titulo').should('contain', 'Cliente atualizado')
  })

  it('informa erro ao tentar salvar sem preencher os dados', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42').as('naoDeveEditarCliente')

    cy.get('#editar-nome').clear()
    cy.get('#editar-sobrenome').clear()
    cy.get('#editar-cpf').clear()
    cy.get('#editar-email').clear()
    cy.get('#form-editar-cliente').submit()

    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'Preencha os campos corretamente')
    cy.get('@naoDeveEditarCliente.all').should('have.length', 0)
  })

  it('informa erro ao trocar o CPF por outro ja cadastrado', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42', {
      statusCode: 400,
      body: { erro: 'CPF já cadastrado.' }
    }).as('editarCliente')

    cy.get('#editar-cpf').clear().type('93541134780')
    cy.get('#form-editar-cliente').submit()

    cy.wait('@editarCliente')
    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'CPF já cadastrado.')
  })

  it('informa erro ao trocar o email por outro ja cadastrado', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42', {
      statusCode: 400,
      body: { erro: 'Email já cadastrado.' }
    }).as('editarCliente')

    cy.get('#editar-email').clear().type('outro@example.com')
    cy.get('#form-editar-cliente').submit()

    cy.wait('@editarCliente')
    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'Email já cadastrado.')
  })

  it('informa erro ao tentar salvar um CPF invalido', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42').as('naoDeveEditarCliente')

    cy.get('#editar-cpf').clear().type('11111111111')
    cy.get('#form-editar-cliente').submit()

    cy.get('.notificacao')
      .should('be.visible')
      .and('contain', 'informe um CPF válido')
    cy.get('@naoDeveEditarCliente.all').should('have.length', 0)
  })
})