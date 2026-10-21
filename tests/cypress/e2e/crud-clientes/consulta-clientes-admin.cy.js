/**
 * ===============================================================================
 * Teste E2E: Consulta de Clientes com Filtros Isolados e Combinados (RF0024)
 * Arquivo: tests/cypress/e2e/crud-clientes/consulta-clientes-admin.cy.js
 * ===============================================================================
 * Regra do DRS RF0024:
 * O sistema deve possibilitar que um cliente seja consultado com base em filtros
 * definidos pelo usuário (nome, CPF, email), tanto de forma isolada quanto combinada.
 * ===============================================================================
 */

describe('Consulta de Clientes - Filtros Isolados e Combinados (RF0024)', () => {
  const baseClientes = [
    {
      id: 42,
      nome: 'Maria',
      sobrenome: 'Silva',
      cpf: '52998224725',
      email: 'maria.silva@glaciar.com',
      telefone: '11987654321',
      tipoUsuario: 0,
      ativo: true,
      createdAt: '2026-01-10T00:00:00Z'
    },
    {
      id: 43,
      nome: 'Carlos',
      sobrenome: 'Eduardo',
      cpf: '62500851060',
      email: 'carlos.trekking@glaciar.com',
      telefone: '11988887777',
      tipoUsuario: 0,
      ativo: false,
      createdAt: '2026-02-15T00:00:00Z'
    },
    {
      id: 44,
      nome: 'Mariana',
      sobrenome: 'Souza',
      cpf: '93541134780',
      email: 'mariana.expedition@glaciar.com',
      telefone: '11977776666',
      tipoUsuario: 0,
      ativo: true,
      createdAt: '2026-03-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    cy.intercept('GET', 'http://localhost:5205/api/conta', {
      statusCode: 200,
      body: baseClientes
    }).as('listarClientes');

    cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html');
    cy.wait('@listarClientes');
  });

  it('lista todos os clientes inicialmente no painel administrativo', () => {
    cy.get('#lista-clientes-container').should('be.visible');
    cy.get('#lista-clientes-container').should('contain', 'Maria Silva');
    cy.get('#lista-clientes-container').should('contain', 'Carlos Eduardo');
    cy.get('#lista-clientes-container').should('contain', 'Mariana Souza');
  });

  const filtrosIsolados = [
    { campo: 'Nome', termo: 'Carlos', esperado: 'Carlos Eduardo', naoEsperado: 'Maria Silva' },
    { campo: 'CPF', termo: '52998224725', esperado: 'Maria Silva', naoEsperado: 'Carlos Eduardo' },
    { campo: 'Email', termo: 'mariana.expedition@glaciar.com', esperado: 'Mariana Souza', naoEsperado: 'Maria Silva' }
  ];

  filtrosIsolados.forEach(({ campo, termo, esperado, naoEsperado }) => {
    it(`filtra clientes de forma isolada por ${campo} (RF0024)`, () => {
      cy.get('#input-busca-cliente').clear().type(`${termo}{enter}`);
      cy.get('#lista-clientes-container').should('contain', esperado);
      cy.get('#lista-clientes-container').should('not.contain', naoEsperado);
    });
  });

  it('filtra clientes por sobrenome (RF0024)', () => {
    cy.get('#input-busca-cliente').clear().type('Silva{enter}');
    cy.get('#lista-clientes-container').should('contain', 'Maria Silva');
    cy.get('#lista-clientes-container').should('not.contain', 'Carlos Eduardo');
    cy.get('#lista-clientes-container').should('not.contain', 'Mariana Souza');
  });

  it('exibe mensagem apropriada quando a consulta não retorna resultados', () => {
    cy.get('#input-busca-cliente').clear().type('Inexistente999{enter}');
    cy.get('#lista-clientes-container')
      .should('be.visible')
      .and('contain', 'Nenhum cliente atende aos critérios da busca.');
  });
});