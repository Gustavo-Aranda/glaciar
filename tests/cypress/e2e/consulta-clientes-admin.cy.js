describe('Consulta de clientes (A)', () => {
  it('consulta a lista de clientes pelo painel administrativo', () => {
    cy.intercept('GET', 'http://localhost:5205/api/conta', {
      statusCode: 200,
      body: [
        {
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
      ]
    }).as('listarClientes')

    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html')
    cy.wait('@listarClientes')

    cy.get('#lista-clientes-container')
      .should('contain', 'Maria Silva')
      .and('contain', 'maria@example.com')
  })
})