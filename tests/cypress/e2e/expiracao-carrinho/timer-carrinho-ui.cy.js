/**
 * ===============================================================================
 * Suite: Temporizador de Reserva de Estoque no Carrinho de Compras (100% Backend Real)
 * Arquivo: tests/cypress/e2e/expiracao-carrinho/timer-carrinho-ui.cy.js
 * ===============================================================================
 * Estratégia Zero-Mock:
 * - Reserva criada de verdade no PostgreSQL via POST /api/carrinho/itens (janela de 15 min).
 * - GET /api/checkout/contexto bate direto no backend real.
 * - Para validar o gatilho visual de <= 5 minutos (<= 300s), avança-se apenas o relógio
 *   do setInterval local (cy.clock / cy.tick), sem qualquer stub HTTP!
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Expiração de Carrinho - Temporizador e Alerta Visual de 5 Minutos (API Real)', () => {
  let clienteTeste;
  let skuReal;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 4 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'TimerCarrinho' }).then((cli) => {
      clienteTeste = cli;
    });
  });

  beforeEach(() => {
    cy.esvaziarCarrinhoReal(clienteTeste.id).then(() =>
      cy.adicionarItemCarrinhoReal(clienteTeste.id, skuReal.estoque.id, 1)
    );
  });

  afterEach(() => {
    if (clienteTeste?.id) {
      cy.esvaziarCarrinhoReal(clienteTeste.id);
    }
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  it('exibe o temporizador ativo com contagem real no formato MM:SS para reserva em andamento (janela de 15 min)', () => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carrinhoAtivo');

    cy.visit(`carrinho.html?id=${clienteTeste.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
      }
    });

    cy.wait('@carrinhoAtivo').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.carrinho.expirado).to.be.false;
      expect(interception.response.body.carrinho.segundosRestantes).to.be.greaterThan(800);
    });

    cy.get('#cart-timer-box').should('be.visible');
    cy.get('#cart-timer-box')
      .invoke('text')
      .should('match', /14:\d{2}|15:00/);
    cy.contains('Estoque reservado por mais', { matchCase: false }).should('be.visible');
  });

  it('aciona aviso visual e alerta quando a reserva real atinge 5 minutos ou menos (<= 300s)', () => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carrinhoAtivo');

    // Controla apenas o setInterval do navegador para avançar o contador real de ~15min até ~4m30s
    cy.clock(Date.now(), ['setInterval', 'clearInterval']);

    cy.visit(`carrinho.html?id=${clienteTeste.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
      }
    });

    cy.wait('@carrinhoAtivo').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      const segundosIniciais = interception.response.body.carrinho.segundosRestantes;
      const avancoPara270s = Math.max(1, segundosIniciais - 270);

      cy.tick(avancoPara270s * 1000);

      cy.get('#cart-timer-box').should('be.visible');
      cy.get('#cart-timer-box').should('contain', '04:30');
      cy.contains('Sua reserva expira em', { matchCase: false }).should('be.visible');
      cy.contains('Finalize sua compra antes que os itens retornem ao estoque', {
        matchCase: false
      }).should('be.visible');
    });
  });
});
