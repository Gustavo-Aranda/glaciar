describe('Cadastrar Cliente (C)', () => {
  beforeEach(() => {
    cy.visit('cadastro.html')
  })

  it('exibe erro quando o CPF informado e invalido', () => {
    cy.get('#nome').type('Maria')
    cy.get('#sobrenome').type('Silva')
    cy.get('#cpf').type('11111111111')
    cy.get('#email').type('maria.silva@example.com')
    cy.get('#telefone').type('11987654321')
    cy.get('#senha').type('Senha123!')

    cy.get('#form-registrar-cliente').submit()

    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Informe um CPF válido.')
  })

  it('cadastra um cliente com os dados normalizados', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/registrar', {
      statusCode: 201,
      body: { id: 42 }
    }).as('registrarCliente')

    cy.get('#nome').type('maria')
    cy.get('#sobrenome').type('da silva')
    cy.get('#cpf').type('62500851060')
    cy.get('#email').type('MARIA.SILVA@EXAMPLE.COM')
    cy.get('#telefone').type('11987654321')
    cy.get('#senha').type('Senha123!')
    cy.get('#form-registrar-cliente').submit()

    cy.wait('@registrarCliente').its('request.body').should('deep.equal', {
      nome: 'Maria',
      sobrenome: 'Da Silva',
      cpf: '62500851060',
      email: 'maria.silva@example.com',
      telefone: '11987654321',
      senha: 'Senha123!'
    })
    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Conta criada com sucesso.')
  })

  it('exibe erro ao tentar cadastrar sem preencher os dados obrigatorios', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/registrar').as('naoDeveCadastrar')

    cy.get('#form-registrar-cliente').submit()

    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios.')
    cy.get('@naoDeveCadastrar.all').should('have.length', 0)
  })

  it('exibe erro ao cadastrar um CPF ja cadastrado', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/registrar', {
      statusCode: 400,
      body: { erro: 'CPF já cadastrado.' }
    }).as('registrarCliente')

    cy.get('#nome').type('Joao')
    cy.get('#sobrenome').type('Souza')
    cy.get('#cpf').type('52998224725')
    cy.get('#email').type('joao.souza@example.com')
    cy.get('#telefone').type('11987654321')
    cy.get('#senha').type('Senha123!')
    cy.get('#form-registrar-cliente').submit()

    cy.wait('@registrarCliente')
    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'CPF já cadastrado.')
  })

  it('exibe erro ao cadastrar um email ja cadastrado', () => {
    cy.intercept('POST', 'http://localhost:5205/api/conta/registrar', {
      statusCode: 400,
      body: { erro: 'Email já cadastrado.' }
    }).as('registrarCliente')

    cy.get('#nome').type('Joao')
    cy.get('#sobrenome').type('Souza')
    cy.get('#cpf').type('62500851060')
    cy.get('#email').type('maria.silva@example.com')
    cy.get('#telefone').type('11987654321')
    cy.get('#senha').type('Senha123!')
    cy.get('#form-registrar-cliente').submit()

    cy.wait('@registrarCliente')
    cy.get('#mensagem-cadastro')
      .should('be.visible')
      .and('contain', 'Email já cadastrado.')
  })
})