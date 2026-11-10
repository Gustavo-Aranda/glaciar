const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Cadastro de endereços (C)', () => {
  let clienteAtivo;
  let enderecosCriados = [];

  before(() => {
    cy.obterClienteAtivoReal().then((cli) => {
      clienteAtivo = cli;
    });
  });

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/enderecos/cliente/${clienteAtivo.id}`).as('listarEnderecos');

    cy.visit(`enderecos.html?id=${clienteAtivo.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.clear();
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteAtivo));
      }
    });

    cy.wait('@listarEnderecos').its('response.statusCode').should('eq', 200);
    cy.get('#btn-novo-endereco').click();
    cy.get('#modal-endereco').should('be.visible');
  });

  afterEach(() => {
    if (enderecosCriados.length > 0) {
      cy.request('GET', `${apiUrl}/enderecos/cliente/${clienteAtivo.id}`).then((res) => {
        enderecosCriados.reverse().forEach((apelidoCriado) => {
          const vinculo = res.body.find((e) => (e.apelido || e.Apelido) === apelidoCriado);
          if (vinculo) {
            cy.request({
              method: 'DELETE',
              url: `${apiUrl}/enderecos/${vinculo.id || vinculo.Id}`,
              failOnStatusCode: false
            });
          }
        });
      });
      enderecosCriados = [];
    }
  });

  it('cadastra um novo endereco real para o cliente ativo da base', () => {
    const apelido = `Casa QA ${Date.now().toString().slice(-5)}`;
    enderecosCriados.push(apelido);

    cy.intercept('POST', `${apiUrl}/enderecos`).as('cadastrarEndereco');

    cy.get('#endereco-apelido').type(apelido);
    cy.get('#endereco-padrao').check();
    cy.get('#endereco-cep').type('08700000');
    cy.get('#endereco-logradouro').type('Rua Jose da Silva');
    cy.get('#endereco-numero').type('123');
    cy.get('#endereco-bairro').type('Centro');
    cy.get('#endereco-cidade').type('Mogi das Cruzes');
    cy.get('#endereco-estado').select('SP');
    cy.get('#form-endereco').submit();

    cy.wait('@cadastrarEndereco').then((interception) => {
      expect(interception.request.body).to.deep.equal({
        usuarioId: clienteAtivo.id,
        apelido,
        padrao: true,
        cep: '08700000',
        logradouro: 'Rua Jose da Silva',
        numero: '123',
        complemento: '',
        bairro: 'Centro',
        cidade: 'Mogi das Cruzes',
        estado: 'SP'
      });
      expect(interception.response.statusCode).to.eq(201);
    });

    cy.get('#lista-enderecos').should('contain', apelido);
  });

  it('recusa cadastro sem preencher os campos obrigatórios', () => {
    cy.intercept('POST', `${apiUrl}/enderecos`).as('naoDeveCadastrar');

    cy.get('#form-endereco').submit();

    cy.get('#mensagem-endereco')
      .should('be.visible')
      .and('contain', 'Preencha todos os campos obrigatórios.');
    cy.get('@naoDeveCadastrar.all').should('have.length', 0);
  });

  it('associa múltiplos endereços de entrega com frase curta/apelido identificador (RF0026)', () => {
    const apelidoMontanha = `Base Camp ${Date.now().toString().slice(-5)}`;
    enderecosCriados.push(apelidoMontanha);

    cy.intercept('POST', `${apiUrl}/enderecos`).as('cadastrarSegundoEndereco');

    cy.get('#endereco-apelido').type(apelidoMontanha);
    cy.get('#endereco-cep').type('12460000');
    cy.get('#endereco-logradouro').type('Estrada dos Picos');
    cy.get('#endereco-numero').type('850');
    cy.get('#endereco-bairro').type('Serra');
    cy.get('#endereco-cidade').type('Campos do Jordao');
    cy.get('#endereco-estado').select('SP');
    cy.get('#form-endereco').submit();

    cy.wait('@cadastrarSegundoEndereco').then((interception) => {
      expect(interception.request.body).to.deep.include({
        usuarioId: clienteAtivo.id,
        apelido: apelidoMontanha,
        cidade: 'Campos do Jordao',
        logradouro: 'Estrada dos Picos',
        numero: '850'
      });
      expect(interception.response.statusCode).to.eq(201);
    });

    cy.get('#lista-enderecos').should('contain', apelidoMontanha);
  });
});
