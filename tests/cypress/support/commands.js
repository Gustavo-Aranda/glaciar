// ***********************************************
// Custom Commands do Glaciar
// ***********************************************

/**
 * Define a sessão do usuário no sessionStorage para simular cliente autenticado
 */
Cypress.Commands.add('definirSessao', (usuario = { id: 42, nome: 'Maria Silva', email: 'maria@example.com' }) => {
  cy.window().then((win) => {
    win.sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  });
});

/**
 * Realiza login via UI ou intercept/API
 */
Cypress.Commands.add('loginCliente', (email = 'cliente@example.com', senha = 'Senha123!', usuario = { id: 42, nome: 'Maria Silva' }) => {
  const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
  cy.intercept('POST', `${apiUrl}/conta/login`, {
    statusCode: 200,
    body: { id: usuario.id, nome: usuario.nome, tipoUsuario: 0 }
  }).as('loginRequest');

  cy.visit('login.html');
  cy.get('#email').type(email);
  cy.get('#password').type(senha);
  cy.get('#loginForm').submit();
  cy.wait('@loginRequest');
});