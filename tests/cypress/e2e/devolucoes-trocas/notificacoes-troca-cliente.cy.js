/**
 * ===============================================================================
 * Suite: Notificações Reais de Troca Autorizada ao Cliente (100% Backend Real)
 * Arquivo: tests/cypress/e2e/devolucoes-trocas/notificacoes-troca-cliente.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Devoluções e Trocas - Notificações Reais ao Cliente', () => {
  let clienteTeste;
  let pedidoTrocaAutorizada;
  let notificacaoReal;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 4 }).then((sku) =>
      cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'NotificacaoTroca' }).then((cli) => {
        clienteTeste = cli;
        return cy
          .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
          .then((end) =>
            cy.criarCartaoReal(cli.id, { padrao: true }).then((cartao) =>
              cy.criarPedidoReal({
                usuarioId: cli.id,
                usuarioEnderecoId: end.usuarioEnderecoId,
                usuarioCartaoId: cartao.id,
                estoqueId: sku.estoque.id,
                quantidade: 1,
                statusAlvo: 'TrocaAceita'
              })
            )
          )
          .then((pedido) => {
            pedidoTrocaAutorizada = pedido;
            return cy.request({
              method: 'GET',
              url: `${apiUrl}/notificacoes`,
              headers: { 'X-Usuario-Id': String(cli.id) }
            });
          })
          .then((resNotif) => {
            expect(resNotif.status).to.eq(200);
            expect(resNotif.body.length).to.be.greaterThan(0);
            notificacaoReal = resNotif.body.find((n) => !n.lida);
            expect(notificacaoReal, 'notificação real gerada em TrocaAceita').to.exist;
          });
      })
    );
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  it('exibe o banner real de notificação em Meus Pedidos e marca como lida via PATCH real no PostgreSQL', () => {
    cy.intercept('GET', `${apiUrl}/notificacoes`).as('obterNotificacoes');
    cy.intercept('PATCH', `${apiUrl}/notificacoes/${notificacaoReal.id}/lida`).as('marcarComoLida');

    cy.visit(`pedidos.html?id=${clienteTeste.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
      }
    });

    cy.wait('@obterNotificacoes').its('response.statusCode').should('eq', 200);

    cy.get('#notificacoes-container').should('be.visible').and('not.have.class', 'hidden');
    cy.contains(
      `Sua solicitação de troca para o pedido ${pedidoTrocaAutorizada.codigo} foi autorizada.`
    ).should('be.visible');

    // Dispensa / marca como lida no backend real
    cy.get(`#notificacao-${notificacaoReal.id} .notificacao-btn-fechar`).click();
    cy.wait('@marcarComoLida').its('response.statusCode').should('eq', 200);

    cy.get(`#notificacao-${notificacaoReal.id}`).should('not.exist');
    cy.get('#notificacoes-container').should('have.class', 'hidden');

    // Confirma no PostgreSQL que a flag lida foi atualizada para true
    cy.request({
      method: 'GET',
      url: `${apiUrl}/notificacoes`,
      headers: { 'X-Usuario-Id': String(clienteTeste.id) }
    }).then((resCheck) => {
      const atualizada = resCheck.body.find((n) => n.id === notificacaoReal.id);
      expect(atualizada.lida).to.be.true;
    });
  });
});
