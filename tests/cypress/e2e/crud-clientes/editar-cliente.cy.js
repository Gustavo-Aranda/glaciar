describe('Alterar Cliente (C)', () => {
  const cliente = {
    id: 42,
    nome: 'Maria',
    sobrenome: 'Silva',
    email: 'maria@example.com',
    telefone: '11987654321'
  }

  beforeEach(() => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42/perfil', {
      statusCode: 200,
      body: { ...cliente, nome: 'Mariana', email: 'mariana@example.com' }
    }).as('atualizarPerfil')

    cy.visit('editar-perfil.html?id=42', {
      onBeforeLoad(window) {
        window.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente))
      }
    })
  })

  it('altera os dados cadastrais do cliente', () => {
    cy.get('#nome').clear().type('Mariana')
    cy.get('#email').clear().type('mariana@example.com')
    cy.get('#telefone').clear().type('11876543210')
    cy.get('#form-editar-perfil').submit()

    cy.wait('@atualizarPerfil').its('request.body').should('deep.equal', {
      nome: 'Mariana',
      sobrenome: 'Silva',
      email: 'mariana@example.com',
      telefone: '11876543210',
      senha: ''
    })
    cy.get('#mensagem-editar-perfil')
      .should('be.visible')
      .and('contain', 'Dados atualizados com sucesso.')
  })

  it('Alteração apenas da senha (C)', () => {
    cy.get('#senha').type('NovaSenha123!')
    cy.get('#form-editar-perfil').submit()

    cy.wait('@atualizarPerfil').its('request.body').should('deep.equal', {
      nome: 'Maria',
      sobrenome: 'Silva',
      email: 'maria@example.com',
      telefone: '11987654321',
      senha: 'NovaSenha123!'
    })
  })

  it('exibe erro ao tentar salvar sem preencher os dados obrigatorios', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42/perfil').as('naoDeveAtualizarPerfil')

    cy.get('#nome').clear()
    cy.get('#sobrenome').clear()
    cy.get('#email').clear()
    cy.get('#telefone').clear()
    cy.get('#form-editar-perfil').submit()

    cy.get('#mensagem-editar-perfil')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios.')
    cy.get('@naoDeveAtualizarPerfil.all').should('have.length', 0)
  })

  it('exibe erro ao trocar o email por outro ja cadastrado', () => {
    cy.intercept('PUT', 'http://localhost:5205/api/conta/42/perfil', {
      statusCode: 400,
      body: { erro: 'Email já cadastrado.' }
    }).as('atualizarPerfil')

    cy.get('#email').clear().type('outro@example.com')
    cy.get('#form-editar-perfil').submit()

    cy.wait('@atualizarPerfil')
    cy.get('#mensagem-editar-perfil')
      .should('be.visible')
      .and('contain', 'Email já cadastrado.')
  })
})
