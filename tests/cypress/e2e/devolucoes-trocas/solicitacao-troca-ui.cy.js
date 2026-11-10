/**
 * ===============================================================================
 * Suite: Solicitação de Troca de Pedidos pelo Cliente (UI & Modal - 100% Backend Real)
 * Arquivo: tests/cypress/e2e/devolucoes-trocas/solicitacao-troca-ui.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Devoluções e Trocas - Solicitação de Troca pelo Cliente (UI Real)', () => {
  let clienteTeste;
  let enderecoReal;
  let cartaoReal;
  let skuReal;
  let pedidoEntregueParcial;
  let pedidoEntregueTotal;
  let pedidoEmTransporte;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 7 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'SolicitaTrocaUI' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoReal = end;
          return cy.criarCartaoReal(cli.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoReal = cartao;
          // 1. Pedido ENTREGUE com 2 unidades (para teste de troca parcial 1 de 2)
          return cy.criarPedidoReal({
            usuarioId: cli.id,
            usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
            usuarioCartaoId: cartao.id,
            estoqueId: skuReal.estoque.id,
            quantidade: 2,
            statusAlvo: 'Entregue'
          });
        })
        .then((p1) => {
          pedidoEntregueParcial = p1;
          // 2. Pedido ENTREGUE com 1 unidade (para teste de troca total)
          return cy.criarPedidoReal({
            usuarioId: clienteTeste.id,
            usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
            usuarioCartaoId: cartaoReal.id,
            estoqueId: skuReal.estoque.id,
            quantidade: 1,
            statusAlvo: 'Entregue'
          });
        })
        .then((p2) => {
          pedidoEntregueTotal = p2;
          // 3. Pedido EM TRANSPORTE (não elegível para troca!)
          return cy.criarPedidoReal({
            usuarioId: clienteTeste.id,
            usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
            usuarioCartaoId: cartaoReal.id,
            estoqueId: skuReal.estoque.id,
            quantidade: 1,
            statusAlvo: 'EmTransporte'
          });
        })
        .then((p3) => {
          pedidoEmTransporte = p3;
        });
    });
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/pedidos`).as('carregarPedidos');

    cy.visit(`pedidos.html?id=${clienteTeste.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteTeste));
      }
    });

    cy.wait('@carregarPedidos').its('response.statusCode').should('eq', 200);
  });

  it('exibe botão "Solicitar Troca" SOMENTE para pedidos com status Entregue (ocultando em EmTransporte)', () => {
    cy.get(`[data-pedido-id="${pedidoEntregueParcial.id}"]`)
      .find('[data-acao="solicitar-troca"]')
      .should('be.visible')
      .and('contain', 'Solicitar Troca');

    cy.get(`[data-pedido-id="${pedidoEmTransporte.id}"]`)
      .find('[data-acao="solicitar-troca"]')
      .should('not.exist');
  });

  it('abre o modal de troca e registra no PostgreSQL a troca parcial por unidade específica (1 de 2)', () => {
    const pedidoProdutoIdReal = pedidoEntregueParcial.itens[0].id;
    cy.intercept('POST', `${apiUrl}/pedidos/${pedidoEntregueParcial.id}/troca`).as(
      'enviarSolicitacaoTroca'
    );

    cy.get(`[data-pedido-id="${pedidoEntregueParcial.id}"] [data-acao="solicitar-troca"]`).click();

    cy.get('#modal-troca').should('be.visible').and('not.have.class', 'hidden');
    cy.get('#modal-troca-titulo').should('contain', pedidoEntregueParcial.codigo);

    cy.get('.troca-item-qtd-input').clear().type('1');
    cy.get('#troca-motivo').type('Tamanho pequeno para o meu uso, gostaria de trocar.');
    cy.get('#form-solicitar-troca').submit();

    cy.wait('@enviarSolicitacaoTroca').then((interception) => {
      expect(interception.request.body).to.deep.include({
        motivo: 'Tamanho pequeno para o meu uso, gostaria de trocar.',
        trocarPedidoInteiro: false
      });
      expect(interception.request.body.itens).to.have.length(1);
      expect(interception.request.body.itens[0]).to.deep.include({
        pedidoProdutoId: pedidoProdutoIdReal,
        quantidade: 1
      });
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.dados.statusAtual).to.eq('TrocaSolicitada');
    });

    cy.get('#modal-troca').should('have.class', 'hidden');
  });

  it('permite solicitar no PostgreSQL a troca de todos os itens do pedido inteiro', () => {
    cy.intercept('POST', `${apiUrl}/pedidos/${pedidoEntregueTotal.id}/troca`).as('trocaTotal');

    cy.get(`[data-pedido-id="${pedidoEntregueTotal.id}"] [data-acao="solicitar-troca"]`).click();
    cy.get('#radio-troca-total').click();
    cy.get('#container-selecao-itens').should('not.be.visible');

    cy.get('#troca-motivo').type('Defeito geral nos itens do pacote.');
    cy.get('#form-solicitar-troca').submit();

    cy.wait('@trocaTotal').then((interception) => {
      expect(interception.request.body.trocarPedidoInteiro).to.be.true;
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body.dados.statusAtual).to.eq('TrocaSolicitada');
    });
  });
});
