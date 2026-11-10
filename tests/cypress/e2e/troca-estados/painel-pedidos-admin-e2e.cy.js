/**
 * ===============================================================================
 * Teste E2E: Painel de Pedidos Admin - Ciclo Logístico, Estoque e Trocas (100% Real)
 * Arquivo: tests/cypress/e2e/troca-estados/painel-pedidos-admin-e2e.cy.js
 * ===============================================================================
 * Comprovações Reais no PostgreSQL:
 * - Listagem real em GET /api/admin/pedidos?tipo=venda e ?tipo=troca
 * - Compra APROVADA (PagamentoRealizado): mantém baixa definitiva de estoque físico
 * - Compra REPROVADA (PagamentoReprovado): devolve imediatamente o saldo ao estoque físico
 * - Despacho e Entrega (EmTransporte -> Entregue)
 * - Ciclo de Troca Admin (TrocaSolicitada -> TrocaAceita e ItemRecebido -> Trocado):
 *   comprova reentrada física do item no estoque E emissão real do cupom de troca no banco!
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Painel Administrativo - Ciclo Logístico, Estoque Real e Trocas', () => {
  let clienteTeste;
  let enderecoReal;
  let cartaoReal;
  let skuReal;

  const consultarQuantidadeEstoqueReal = () =>
    cy.request('GET', `${apiUrl}/produtos/${skuReal.produto.id}`).then((res) => {
      const sku = res.body.estoques.find((e) => (e.estoqueId ?? e.id) === skuReal.estoque.id);
      return sku.quantidade;
    });

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 8 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Carlos', sobrenome: 'LogisticaAdmin' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoReal = end;
          return cy.criarCartaoReal(cli.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoReal = cartao;
        });
    });
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  it('lista pedidos reais de venda, APROVA pagamento mantendo a baixa de estoque e avança até EmTransporte e Entregue', () => {
    let estoqueAntesDaCompra;
    let pedidoVenda;

    consultarQuantidadeEstoqueReal()
      .then((qtdInicial) => {
        estoqueAntesDaCompra = qtdInicial;
        return cy.criarPedidoReal({
          usuarioId: clienteTeste.id,
          usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
          usuarioCartaoId: cartaoReal.id,
          estoqueId: skuReal.estoque.id,
          quantidade: 1,
          statusAlvo: 'EmProcessamento'
        });
      })
      .then((pedido) => {
        pedidoVenda = pedido;

        cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=venda`).as('carregarPedidosVenda');
        cy.intercept('PATCH', `${apiUrl}/admin/pedidos/${pedidoVenda.id}/status`).as('patchStatusVenda');

        cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html');
        cy.wait('@carregarPedidosVenda').its('response.statusCode').should('eq', 200);

        cy.get('#pedidos-container').should('be.visible');
        cy.contains(`Pedido #${pedidoVenda.codigo}`).should('be.visible');

        // 1. Admin APROVA pagamento (EmProcessamento -> PagamentoRealizado)
        cy.get(`#status-select-${pedidoVenda.id}`).select('PagamentoRealizado');
        cy.get(`#status-select-${pedidoVenda.id}`).siblings('button').click();

        cy.wait('@patchStatusVenda').then((interception) => {
          expect(interception.request.body.status).to.eq('PagamentoRealizado');
          expect(interception.response.statusCode).to.eq(200);
        });
        cy.get('#notificacoes-container').should('contain', 'Status atualizado com sucesso');
        cy.wait('@carregarPedidosVenda');

        // Comprova baixa definitiva mantida no estoque físico após aprovação (estoqueInicial - 1)
        consultarQuantidadeEstoqueReal().should('eq', estoqueAntesDaCompra - 1);

        // 2. Admin DESPACHA pedido (PagamentoRealizado -> EmTransporte)
        cy.get(`#status-select-${pedidoVenda.id}`).select('EmTransporte');
        cy.get(`#status-select-${pedidoVenda.id}`).siblings('button').click();
        cy.wait('@patchStatusVenda').its('response.body.dados.statusAtual').should('eq', 'EmTransporte');
        cy.wait('@carregarPedidosVenda');

        // 3. Admin confirma ENTREGA (EmTransporte -> Entregue)
        cy.get(`#status-select-${pedidoVenda.id}`).select('Entregue');
        cy.get(`#status-select-${pedidoVenda.id}`).siblings('button').click();
        cy.wait('@patchStatusVenda').its('response.body.dados.statusAtual').should('eq', 'Entregue');
      });
  });

  it('permite ao Admin REPROVAR pagamento devolvendo imediatamente o saldo ao estoque físico real (RN0028)', () => {
    let estoqueAntesDaCompra;
    let pedidoParaReprovar;

    consultarQuantidadeEstoqueReal()
      .then((qtdInicial) => {
        estoqueAntesDaCompra = qtdInicial;
        return cy.criarPedidoReal({
          usuarioId: clienteTeste.id,
          usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
          usuarioCartaoId: cartaoReal.id,
          estoqueId: skuReal.estoque.id,
          quantidade: 2,
          statusAlvo: 'EmProcessamento'
        });
      })
      .then((pedido) => {
        pedidoParaReprovar = pedido;

        // Durante EmProcessamento, as 2 unidades estão reservadas/deduzidas do estoque
        consultarQuantidadeEstoqueReal().should('eq', estoqueAntesDaCompra - 2);

        cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=venda`).as('carregarPedidosVenda');
        cy.intercept('PATCH', `${apiUrl}/admin/pedidos/${pedidoParaReprovar.id}/status`).as(
          'reprovarPagamento'
        );

        cy.visit('http://127.0.0.1:5500/frontend/admin/pedidos.html');
        cy.wait('@carregarPedidosVenda').its('response.statusCode').should('eq', 200);

        cy.get(`#status-select-${pedidoParaReprovar.id}`).select('PagamentoReprovado');
        cy.get(`#status-select-${pedidoParaReprovar.id}`).siblings('button').click();

        cy.wait('@reprovarPagamento').then((interception) => {
          expect(interception.request.body.status).to.eq('PagamentoReprovado');
          expect(interception.response.statusCode).to.eq(200);
          expect(interception.response.body.dados.statusAtual).to.eq('PagamentoReprovado');
        });

        cy.get('#notificacoes-container')
          .should('be.visible')
          .and('contain', 'Status atualizado com sucesso');

        // Comprova que as 2 unidades retornaram integralmente ao estoque físico no PostgreSQL!
        consultarQuantidadeEstoqueReal().should('eq', estoqueAntesDaCompra);
      });
  });

  it('gerencia o ciclo completo de troca no painel Admin: autorização, recebimento físico, reentrada em estoque e emissão real de cupom', () => {
    const motivoTroca = 'Costura lateral descosturada na expedição alpina';
    let pedidoTroca;
    let estoqueAntesDeConcluirTroca;

    cy.criarPedidoReal({
      usuarioId: clienteTeste.id,
      usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
      usuarioCartaoId: cartaoReal.id,
      estoqueId: skuReal.estoque.id,
      quantidade: 1,
      statusAlvo: 'Entregue'
    })
      .then((pedidoEntregue) =>
        cy
          .request({
            method: 'POST',
            url: `${apiUrl}/pedidos/${pedidoEntregue.id}/troca`,
            headers: { 'X-Usuario-Id': String(clienteTeste.id) },
            body: { trocarPedidoInteiro: true, motivo: motivoTroca }
          })
          .then(() => pedidoEntregue)
      )
      .then((pedido) => {
        pedidoTroca = pedido;

        cy.intercept('GET', `${apiUrl}/admin/pedidos?tipo=troca`).as('carregarDevolucoesAdmin');
        cy.intercept('PATCH', `${apiUrl}/admin/pedidos/${pedidoTroca.id}/status`).as(
          'patchStatusTroca'
        );

        cy.visit('http://127.0.0.1:5500/frontend/admin/devolucoes.html');
        cy.wait('@carregarDevolucoesAdmin').its('response.statusCode').should('eq', 200);

        cy.contains(motivoTroca).should('be.visible');

        // 1. Admin autoriza a troca (TrocaSolicitada -> TrocaAceita)
        cy.get(`#status-select-${pedidoTroca.id}`).select('TrocaAceita');
        cy.get(`#status-select-${pedidoTroca.id}`).siblings('button').click();
        cy.wait('@patchStatusTroca').its('response.body.dados.statusAtual').should('eq', 'TrocaAceita');
        cy.wait('@carregarDevolucoesAdmin');

        // 2. Cliente despacha o item nos Correios (TrocaAceita -> ItemEnviado)
        cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedidoTroca.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) },
          body: { status: 'ItemEnviado' }
        }).its('status').should('eq', 200);

        cy.reload();
        cy.wait('@carregarDevolucoesAdmin');

        // 3. Admin confirma recebimento físico no CD (ItemEnviado -> ItemRecebido)
        cy.get(`#status-select-${pedidoTroca.id}`).select('ItemRecebido');
        cy.get(`#status-select-${pedidoTroca.id}`).siblings('button').click();
        cy.wait('@patchStatusTroca').its('response.body.dados.statusAtual').should('eq', 'ItemRecebido');
        cy.wait('@carregarDevolucoesAdmin');

        return consultarQuantidadeEstoqueReal();
      })
      .then((qtdAntesConcluir) => {
        estoqueAntesDeConcluirTroca = qtdAntesConcluir;

        // 4. Admin conclui conferência e gera cupom (ItemRecebido -> Trocado)
        cy.get(`#status-select-${pedidoTroca.id}`).select('Trocado');
        cy.get(`#status-select-${pedidoTroca.id}`).siblings('button').click();

        cy.wait('@patchStatusTroca').then((interception) => {
          expect(interception.response.statusCode).to.eq(200);
          const dados = interception.response.body.dados;
          expect(dados.statusAtual).to.eq('Trocado');
          expect(dados.cupomTrocaGerado).to.exist;

          const codigoCupom = dados.cupomTrocaGerado.codigo;
          const valorCupom = Number(dados.cupomTrocaGerado.valorDesconto);
          expect(valorCupom).to.eq(Number(skuReal.produto.preco));

          cy.get('#notificacoes-container')
            .should('be.visible')
            .and('contain', codigoCupom);

          // Comprova reentrada real de +1 unidade no estoque físico no PostgreSQL
          consultarQuantidadeEstoqueReal().should('eq', estoqueAntesDeConcluirTroca + 1);

          // Comprova persistência real do cupom na carteira do cliente no PostgreSQL
          cy.request('GET', `${apiUrl}/cupons/cliente/${clienteTeste.id}`).then((resCupons) => {
            const cupomBanco = resCupons.body.find((c) => c.codigo === codigoCupom);
            expect(cupomBanco, 'cupom de troca gravado no PostgreSQL').to.exist;
            expect(cupomBanco.valorDesconto).to.eq(valorCupom);
            expect(cupomBanco.categoria).to.eq('Troca');
          });
        });
      });
  });
});
