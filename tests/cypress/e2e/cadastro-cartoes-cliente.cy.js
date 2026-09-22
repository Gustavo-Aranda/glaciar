describe('Cadastro de cartões de crédito (C)', () => {
  let cartoesCadastrados = []

  const cliente = {
    id: 13,
    nome: 'Maria',
    sobrenome: 'Silva',
    email: 'maria@example.com',
    telefone: '11987654321'
  }

  beforeEach(() => {
    cartoesCadastrados = []

    cy.intercept('GET', 'http://localhost:5205/api/cartoes/cliente/42', request => {
      request.reply({ statusCode: 200, body: cartoesCadastrados })
    }).as('listarCartoes')

    cy.intercept('POST', 'http://localhost:5205/api/cartoes', request => {
      const cartao = {
        id: cartoesCadastrados.length + 1,
        cartaoId: cartoesCadastrados.length + 1,
        ultimosDigitos: request.body.numero.slice(-4),
        bandeira: request.body.bandeira,
        mesValidade: request.body.mesValidade,
        anoValidade: request.body.anoValidade,
        padrao: request.body.padrao
      }
      cartoesCadastrados.push(cartao)
      request.reply({ statusCode: 201, body: cartao })
    }).as('cadastrarCartao')

    cy.visit('pagamentos.html?id=42', {
      onBeforeLoad(window) {
        window.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente))
      }
    })
    cy.wait('@listarCartoes')
  })

  it('associa diversos cartões ao cliente e mantém um cartão preferencial', () => {
    cy.get('.btn-text-add').click()
    cy.get('#cartao-numero').type('5158376442285253')
    cy.get('#cartao-cvv').type('765')
    cy.get('#cartao-bandeira').select('Mastercard')
    cy.get('#cartao-mes').type('7')
    cy.get('#cartao-ano').type('2027')
    cy.get('#cartao-padrao').check()
    cy.get('#form-cartao').submit()

    cy.wait('@cadastrarCartao').its('request.body').should('deep.equal', {
      usuarioId: 42,
      numero: '5158376442285253',
      cvv: '765',
      bandeira: 'Mastercard',
      mesValidade: 7,
      anoValidade: 2027,
      padrao: true
    })

    cy.get('.btn-text-add').click()
    cy.get('#cartao-numero').type('4916511493269188')
    cy.get('#cartao-cvv').type('690')
    cy.get('#cartao-bandeira').select('Visa')
    cy.get('#cartao-mes').type('11')
    cy.get('#cartao-ano').type('2027')
    cy.get('#form-cartao').submit()

    cy.wait('@cadastrarCartao').its('request.body').should('deep.equal', {
      usuarioId: 42,
      numero: '4916511493269188',
      cvv: '690',
      bandeira: 'Visa',
      mesValidade: 11,
      anoValidade: 2027,
      padrao: false
    })

    cy.get('#lista-cartoes .wallet-item').should('have.length', 2)
    cy.get('#lista-cartoes').should('contain', 'Cartão final 5253')
      .and('contain', 'Cartão final 9188')
  })

  it('exibe erro ao cadastrar cartão com número inválido', () => {
    cy.intercept('POST', 'http://localhost:5205/api/cartoes', {
      statusCode: 400,
      body: { erro: 'O número do cartão é inválido.' }
    }).as('cadastrarCartaoInvalido')

    cy.get('.btn-text-add').click()
    cy.get('#cartao-numero').type('5158376442285254')
    cy.get('#cartao-cvv').type('765')
    cy.get('#cartao-bandeira').select('Mastercard')
    cy.get('#cartao-mes').type('7')
    cy.get('#cartao-ano').type('2027')
    cy.get('#form-cartao').submit()

    cy.wait('@cadastrarCartaoInvalido').its('request.body').should('include', {
      usuarioId: 42,
      numero: '5158376442285254',
      cvv: '765'
    })
    cy.get('#mensagem-cartao')
      .should('be.visible')
      .and('contain', 'O número do cartão é inválido.')
  })
})
