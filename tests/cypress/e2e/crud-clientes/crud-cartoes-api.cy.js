const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('CRUD de cartões de crédito (C) - API', () => {
  const usuarioId = 13
  const cartoesCriados = []

  afterEach(() => {
    cartoesCriados.reverse().forEach(cartaoId => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/cartoes/${usuarioId}/${cartaoId}`,
        failOnStatusCode: false
      })
    })
    cartoesCriados.length = 0
  })

  it('cria e consulta dois cartões reais, com um preferencial', () => {
    cy.request('POST', `${apiUrl}/cartoes`, {
      usuarioId,
      numero: '5158376442285253',
      cvv: '765',
      bandeira: 'Mastercard',
      mesValidade: 7,
      anoValidade: 2027,
      padrao: true
    }).then(primeiraResposta => {
      expect(primeiraResposta.status).to.eq(201)
      expect(primeiraResposta.body).to.include({
        ultimosDigitos: '5253',
        bandeira: 'Mastercard',
        mesValidade: 7,
        anoValidade: 2027,
        padrao: true
      })
      expect(primeiraResposta.body).not.to.have.any.keys('numero', 'cvv')
      cartoesCriados.push(primeiraResposta.body.id)

      return cy.request('POST', `${apiUrl}/cartoes`, {
        usuarioId,
        numero: '4916511493269188',
        cvv: '690',
        bandeira: 'Visa',
        mesValidade: 11,
        anoValidade: 2027,
        padrao: false
      })
    }).then(segundaResposta => {
      expect(segundaResposta.status).to.eq(201)
      expect(segundaResposta.body).to.include({
        ultimosDigitos: '9188',
        bandeira: 'Visa',
        mesValidade: 11,
        anoValidade: 2027,
        padrao: false
      })
      cartoesCriados.push(segundaResposta.body.id)

      return cy.request('GET', `${apiUrl}/cartoes/cliente/${usuarioId}`)
    }).then(consulta => {
      expect(consulta.status).to.eq(200)
      expect(consulta.body.some(cartao =>
        cartao.ultimosDigitos === '5253' && cartao.padrao === true
      )).to.be.true
      expect(consulta.body.some(cartao =>
        cartao.ultimosDigitos === '9188' && cartao.padrao === false
      )).to.be.true
    })
  })

  it('rejeita cartão com número inválido', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/cartoes`,
      failOnStatusCode: false,
      body: {
        usuarioId,
        numero: '5158376442285254',
        cvv: '765',
        bandeira: 'Mastercard',
        mesValidade: 7,
        anoValidade: 2027,
        padrao: false
      }
    }).then(resposta => {
      expect(resposta.status).to.eq(400)
      expect(resposta.body.erro).to.contain('número do cartão é inválido')
    })
  })

  it('rejeita cartão com CVV inválido', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/cartoes`,
      failOnStatusCode: false,
      body: {
        usuarioId,
        numero: '4916511493269188',
        cvv: '12',
        bandeira: 'Visa',
        mesValidade: 11,
        anoValidade: 2027,
        padrao: false
      }
    }).then(resposta => {
      expect(resposta.status).to.eq(400)
      expect(resposta.body.erro).to.contain('CVV do cartão é inválido')
    })
  })
})
