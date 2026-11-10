/**
 * ===============================================================================
 * Teste E2E: Consulta de Clientes com Filtros Isolados e Combinados (RF0024)
 * Integração 100% Real com Backend C# e PostgreSQL
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Consulta de Clientes - Filtros Isolados e Combinados (RF0024)', () => {
  let clienteExistenteReal;
  let clienteTeste1;
  let clienteTeste2;
  const idsCriados = [];

  before(() => {
    cy.obterClienteAtivoReal().then((cli) => {
      clienteExistenteReal = cli;
    });

    const sufixo = String(Date.now()).slice(-5);
    cy.criarClienteTesteReal({
      nome: `Alpinista${sufixo}`,
      sobrenome: `Cordilheira${sufixo}`,
      email: Cypress.glaciar.gerarEmailUnico('alpinista.busca')
    }).then((c1) => {
      clienteTeste1 = c1;
      idsCriados.push(c1.id);
    });

    cy.criarClienteTesteReal({
      nome: `Escaladora${sufixo}`,
      sobrenome: `Patagonia${sufixo}`,
      email: Cypress.glaciar.gerarEmailUnico('escaladora.busca')
    }).then((c2) => {
      clienteTeste2 = c2;
      idsCriados.push(c2.id);
    });
  });

  after(() => {
    idsCriados.reverse().forEach((id) => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${id}`,
        failOnStatusCode: false
      });
    });
  });

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/conta`).as('listarClientes');
    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html');
    cy.wait('@listarClientes').its('response.statusCode').should('eq', 200);
  });

  it('lista clientes reais cadastrados no banco inicialmente no painel administrativo', () => {
    cy.get('#lista-clientes-container').should('be.visible');
    cy.get('#lista-clientes-container').should('contain', clienteExistenteReal.email);
    cy.get('#lista-clientes-container').should('contain', `${clienteTeste1.nome} ${clienteTeste1.sobrenome}`);
    cy.get('#lista-clientes-container').should('contain', `${clienteTeste2.nome} ${clienteTeste2.sobrenome}`);
  });

  it('filtra clientes reais de forma isolada por Nome (RF0024)', () => {
    cy.get('#input-busca-cliente').clear().type(`${clienteTeste1.nome}{enter}`);
    cy.get('#lista-clientes-container').should('contain', `${clienteTeste1.nome} ${clienteTeste1.sobrenome}`);
    cy.get('#lista-clientes-container').should('not.contain', `${clienteTeste2.nome} ${clienteTeste2.sobrenome}`);
  });

  it('filtra clientes reais de forma isolada por CPF (RF0024)', () => {
    cy.get('#input-busca-cliente').clear().type(`${clienteTeste1.cpf}{enter}`);
    cy.get('#lista-clientes-container').should('contain', `${clienteTeste1.nome} ${clienteTeste1.sobrenome}`);
    cy.get('#lista-clientes-container').should('not.contain', `${clienteTeste2.nome} ${clienteTeste2.sobrenome}`);
  });

  it('filtra clientes reais de forma isolada por Email (RF0024)', () => {
    cy.get('#input-busca-cliente').clear().type(`${clienteTeste2.email}{enter}`);
    cy.get('#lista-clientes-container').should('contain', `${clienteTeste2.nome} ${clienteTeste2.sobrenome}`);
    cy.get('#lista-clientes-container').should('not.contain', `${clienteTeste1.nome} ${clienteTeste1.sobrenome}`);
  });

  it('filtra clientes reais por sobrenome (RF0024)', () => {
    cy.get('#input-busca-cliente').clear().type(`${clienteTeste1.sobrenome}{enter}`);
    cy.get('#lista-clientes-container').should('contain', `${clienteTeste1.nome} ${clienteTeste1.sobrenome}`);
    cy.get('#lista-clientes-container').should('not.contain', `${clienteTeste2.nome} ${clienteTeste2.sobrenome}`);
  });

  it('exibe mensagem apropriada quando a consulta não retorna resultados', () => {
    cy.get('#input-busca-cliente').clear().type(`RegistroInexistenteQA${Date.now()}{enter}`);
    cy.get('#lista-clientes-container')
      .should('be.visible')
      .and('contain', 'Nenhum cliente atende aos critérios da busca.');
  });
});
