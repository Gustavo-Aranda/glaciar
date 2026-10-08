describe('Cadastro de endereços (C)', () => {
  beforeEach(() => {
    cy.intercept('GET', 'http://localhost:5205/api/enderecos/cliente/42', {
      statusCode: 200,
      body: []
    }).as('listarEnderecos')

    cy.visit('http://127.0.0.1:5500/frontend/user/enderecos.html?id=42', {
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

    cy.wait('@listarEnderecos')
    cy.get('#btn-novo-endereco').click()
    cy.get('#modal-endereco').should('be.visible')
  })

  it('cadastra um novo endereco para o cliente', () => {
    cy.intercept('POST', 'http://localhost:5205/api/enderecos', {
      statusCode: 201,
      body: { id: 10 }
    }).as('cadastrarEndereco')

    cy.get('#endereco-apelido').type('Casa')
    cy.get('#endereco-padrao').check()
    cy.get('#endereco-cep').type('08700000')
    cy.get('#endereco-logradouro').type('Rua Jose da Silva')
    cy.get('#endereco-numero').type('123')
    cy.get('#endereco-bairro').type('Centro')
    cy.get('#endereco-cidade').type('Mogi das Cruzes')
    cy.get('#endereco-estado').select('SP')
    cy.get('#form-endereco').submit()

    cy.wait('@cadastrarEndereco').its('request.body').should('deep.equal', {
      usuarioId: 42,
      apelido: 'Casa',
      padrao: true,
      cep: '08700000',
      logradouro: 'Rua Jose da Silva',
      numero: '123',
      complemento: '',
      bairro: 'Centro',
      cidade: 'Mogi das Cruzes',
      estado: 'SP'
    })
  })

  it('recusa cadastro sem preencher os campos obrigatórios', () => {
    cy.intercept('POST', 'http://localhost:5205/api/enderecos').as('naoDeveCadastrar')

    cy.get('#form-endereco').submit()

    cy.get('#mensagem-endereco')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios.')
    cy.get('@naoDeveCadastrar.all').should('have.length', 0)
  })
})