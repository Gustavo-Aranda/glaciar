/**
 * ===============================================================================
 * Teste E2E & Segurança: Validação de Atores e Isolamento IDOR (100% Backend Real)
 * Arquivo: tests/cypress/e2e/validacao-atores/autorizacao-cliente-admin-status.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Validação de Atores - Permissões Reais de Cliente vs Admin e Isolamento IDOR', () => {
  let clienteA;
  let enderecoA;
  let cartaoA;
  let clienteB;
  let skuReal;
  const idsUsuarios = [];

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 8 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'AtorClienteA' }).then((cliA) => {
      clienteA = cliA;
      idsUsuarios.push(cliA.id);
      return cy
        .criarEnderecoReal(cliA.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoA = end;
          return cy.criarCartaoReal(cliA.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoA = cartao;
        });
    });

    cy.criarClienteTesteReal({ nome: 'Roberto', sobrenome: 'OutroClienteIDOR' }).then((cliB) => {
      clienteB = cliB;
      idsUsuarios.push(cliB.id);
    });
  });

  after(() => {
    idsUsuarios.reverse().forEach((id) => {
      cy.limparUsuarioTesteReal(id);
    });
  });

  const criarPedidoClienteA = (statusAlvo) =>
    cy.criarPedidoReal({
      usuarioId: clienteA.id,
      usuarioEnderecoId: enderecoA.usuarioEnderecoId,
      usuarioCartaoId: cartaoA.id,
      estoqueId: skuReal.estoque.id,
      quantidade: 1,
      statusAlvo
    });

  context('Bloqueios Reais de Atores Não Autorizados via API (HTTP 400)', () => {
    it('Cliente NÃO PODE auto-aprovar o próprio pagamento (EmProcessamento -> PagamentoRealizado)', () => {
      criarPedidoClienteA('EmProcessamento').then((pedido) => {
        cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedido.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteA.id) },
          body: { status: 'PagamentoRealizado' },
          failOnStatusCode: false
        }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.message).to.match(/não pode ser executada pelo ator/i);
        });
      });
    });

    it('Cliente NÃO PODE auto-aprovar troca (TrocaSolicitada -> TrocaAceita)', () => {
      criarPedidoClienteA('TrocaSolicitada').then((pedido) => {
        cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedido.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteA.id) },
          body: { status: 'TrocaAceita' },
          failOnStatusCode: false
        }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.message).to.match(/não pode ser executada pelo ator/i);
        });
      });
    });

    it('Cliente NÃO PODE auto-concluir conferência física nem emitir cupom (ItemRecebido -> Trocado)', () => {
      criarPedidoClienteA('ItemRecebido').then((pedido) => {
        cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedido.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteA.id) },
          body: { status: 'Trocado' },
          failOnStatusCode: false
        }).then((res) => {
          expect(res.status).to.eq(400);
          expect(res.body.message).to.match(/não pode ser executada pelo ator/i);
        });
      });
    });
  });

  context('Permissões Válidas do Cliente via UI Real', () => {
    it('Cliente PODE confirmar recebimento do pedido real na interface (EmTransporte -> Entregue)', () => {
      criarPedidoClienteA('EmTransporte').then((pedido) => {
        cy.intercept('GET', `${apiUrl}/pedidos`).as('obterPedidos');
        cy.intercept('PATCH', `${apiUrl}/pedidos/${pedido.id}/status`).as('confirmarRecebimentoUI');

        cy.visit(`pedidos.html?id=${clienteA.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteA));
          }
        });

        cy.wait('@obterPedidos').its('response.statusCode').should('eq', 200);
        cy.get(`[data-pedido-id="${pedido.id}"] [data-acao="confirmar-recebimento"]`).click();
        cy.get('#btn-modal-confirm-ok').click();

        cy.wait('@confirmarRecebimentoUI').then((interception) => {
          expect(interception.request.body.status).to.eq('Entregue');
          expect(interception.response.statusCode).to.eq(200);
          expect(interception.response.body.dados.statusAtual).to.eq('Entregue');
        });
      });
    });

    it('Cliente PODE informar despacho do pacote real de devolução na interface (TrocaAceita -> ItemEnviado)', () => {
      criarPedidoClienteA('TrocaAceita').then((pedido) => {
        cy.intercept('GET', `${apiUrl}/pedidos`).as('obterPedidosTroca');
        cy.intercept('PATCH', `${apiUrl}/pedidos/${pedido.id}/status`).as('despacharPacoteUI');

        cy.visit(`pedidos.html?id=${clienteA.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteA));
          }
        });

        cy.wait('@obterPedidosTroca').its('response.statusCode').should('eq', 200);
        cy.get(`[data-pedido-id="${pedido.id}"] [data-acao="confirmar-despacho"]`).click();
        cy.get('#btn-modal-confirm-ok').click();

        cy.wait('@despacharPacoteUI').then((interception) => {
          expect(interception.request.body.status).to.eq('ItemEnviado');
          expect(interception.response.statusCode).to.eq(200);
          expect(interception.response.body.dados.statusAtual).to.eq('ItemEnviado');
        });
      });
    });
  });

  context('Isolamento IDOR Real entre Clientes Distintos', () => {
    it('Cliente B tentando consultar ou alterar pedido real do Cliente A recebe 404 sem vazamento de dados', () => {
      criarPedidoClienteA('EmTransporte').then((pedidoDeA) => {
        // 1. Tentativa de leitura cruzada (GET)
        cy.request({
          method: 'GET',
          url: `${apiUrl}/pedidos/${pedidoDeA.id}`,
          headers: { 'X-Usuario-Id': String(clienteB.id) },
          failOnStatusCode: false
        }).then((resGet) => {
          expect(resGet.status).to.eq(404);
          expect(resGet.body.message).to.contain('não encontrado');
        });

        // 2. Tentativa de mutação cruzada (PATCH)
        cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedidoDeA.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteB.id) },
          body: { status: 'Entregue' },
          failOnStatusCode: false
        }).then((resPatch) => {
          expect(resPatch.status).to.eq(404);
        });
      });
    });
  });
});
