/**
 * ===============================================================================
 * Suite: Acompanhamento de Devoluções e Reutilização Real do Cupom de Troca
 * Arquivo: tests/cypress/e2e/devolucoes-trocas/devolucoes-acompanhamento-ui.cy.js
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

describe('Devoluções e Trocas - Acompanhamento do Fluxo Reversivo (UI Real)', () => {
  let clienteComTrocas;
  let clienteSemTrocas;
  let enderecoClienteTrocas;
  let cartaoClienteTrocas;
  let skuMenor;
  let skuMaior;
  let pedidoTrocaAceita;
  let pedidoTrocado;
  let cupomEmitidoNaTroca;
  const idsParaLimpar = [];

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 5, maxPreco: 450 }).then((menor) => {
      skuMenor = menor;
      return cy
        .obterSkuComEstoqueReal({
          minEstoque: 5,
          minPreco: 600,
          excluirProdutoIds: [menor.produto.id]
        })
        .then((maior) => {
          skuMaior = maior;
        });
    });

    // 1. Cliente com 1 pedido em TrocaAceita e 1 pedido em Trocado (gerando cupom real!)
    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'FluxoDevolucoes' }).then((cli) => {
      clienteComTrocas = cli;
      idsParaLimpar.push(cli.id);
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoClienteTrocas = end;
          return cy.criarCartaoReal(cli.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoClienteTrocas = cartao;
          return cy.criarPedidoReal({
            usuarioId: cli.id,
            usuarioEnderecoId: enderecoClienteTrocas.usuarioEnderecoId,
            usuarioCartaoId: cartao.id,
            estoqueId: skuMenor.estoque.id,
            quantidade: 1,
            statusAlvo: 'Entregue'
          });
        })
        .then((pEntregue) =>
          cy
            .request({
              method: 'POST',
              url: `${apiUrl}/pedidos/${pEntregue.id}/troca`,
              headers: { 'X-Usuario-Id': String(clienteComTrocas.id) },
              body: {
                trocarPedidoInteiro: true,
                motivo: 'Produto com numeração apertada para o meu pé'
              }
            })
            .then(() =>
              cy.request('PATCH', `${apiUrl}/admin/pedidos/${pEntregue.id}/status`, {
                status: 'TrocaAceita'
              })
            )
            .then(() =>
              cy
                .request({
                  method: 'GET',
                  url: `${apiUrl}/pedidos/${pEntregue.id}`,
                  headers: { 'X-Usuario-Id': String(clienteComTrocas.id) }
                })
                .its('body')
            )
        )
        .then((pAceita) => {
          pedidoTrocaAceita = pAceita;
          return cy.criarPedidoReal({
            usuarioId: clienteComTrocas.id,
            usuarioEnderecoId: enderecoClienteTrocas.usuarioEnderecoId,
            usuarioCartaoId: cartaoClienteTrocas.id,
            estoqueId: skuMenor.estoque.id,
            quantidade: 1,
            statusAlvo: 'Trocado'
          });
        })
        .then((pTrocado) => {
          pedidoTrocado = pTrocado;
          return cy.request({
            method: 'GET',
            url: `${apiUrl}/cupons/trocas`,
            headers: { 'X-Usuario-Id': String(clienteComTrocas.id) }
          });
        })
        .then((resCupons) => {
          cupomEmitidoNaTroca = resCupons.body[0];
          expect(cupomEmitidoNaTroca, 'cupom emitido pela troca concluída').to.exist;
        });
    });

    // 2. Cliente apenas com pedido Entregue normal (sem trocas) para validar Empty State
    cy.criarClienteTesteReal({ nome: 'Joao', sobrenome: 'SemTrocas' }).then((cli2) => {
      clienteSemTrocas = cli2;
      idsParaLimpar.push(cli2.id);
      return cy
        .criarEnderecoReal(cli2.id, { estado: 'SP', padrao: true })
        .then((end2) =>
          cy.criarCartaoReal(cli2.id, { padrao: true }).then((cartao2) =>
            cy.criarPedidoReal({
              usuarioId: cli2.id,
              usuarioEnderecoId: end2.usuarioEnderecoId,
              usuarioCartaoId: cartao2.id,
              estoqueId: skuMenor.estoque.id,
              quantidade: 1,
              statusAlvo: 'Entregue'
            })
          )
        );
    });
  });

  after(() => {
    idsParaLimpar.reverse().forEach((id) => {
      cy.limparUsuarioTesteReal(id);
    });
  });

  it('exibe cards reais de troca com código reverso e registra despacho do pacote no banco', () => {
    cy.intercept('GET', `${apiUrl}/pedidos`).as('carregarDevolucoes');
    cy.intercept('PATCH', `${apiUrl}/pedidos/${pedidoTrocaAceita.id}/status`).as(
      'despacharPacote'
    );

    cy.visit(`devolucoes.html?id=${clienteComTrocas.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteComTrocas));
      }
    });

    cy.wait('@carregarDevolucoes').its('response.statusCode').should('eq', 200);

    cy.contains(`Troca #${pedidoTrocaAceita.codigo}`).should('be.visible');
    cy.contains('Troca Autorizada').should('be.visible');
    cy.contains(`REV-${pedidoTrocaAceita.codigo}`).should('be.visible');
    cy.contains('Produto com numeração apertada para o meu pé').should('be.visible');

    cy.contains(`Troca #${pedidoTrocado.codigo}`).should('be.visible');
    cy.contains('Troca Concluída').should('be.visible');
    cy.contains('Cupom de Troca emitido', { matchCase: false }).should('be.visible');

    cy.get(`[data-acao="despachar-item"][data-pedido-id="${pedidoTrocaAceita.id}"]`).click();
    cy.get('#btn-modal-confirm-ok').should('be.visible').click();

    cy.wait('@despacharPacote').then((interception) => {
      expect(interception.request.body.status).to.eq('ItemEnviado');
      expect(interception.response.statusCode).to.eq(200);
    });
  });

  it('exibe mensagem amigável de estado vazio quando o cliente possui pedidos mas nenhuma devolução', () => {
    cy.intercept('GET', `${apiUrl}/pedidos`).as('semDevolucoes');

    cy.visit(`devolucoes.html?id=${clienteSemTrocas.id}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteSemTrocas));
      }
    });

    cy.wait('@semDevolucoes').its('response.statusCode').should('eq', 200);
    cy.contains('Nenhuma devolução ou troca ativa', { matchCase: false }).should('be.visible');
    cy.contains('Acessar Meus Pedidos').should('be.visible');
  });

  it('permite reutilizar o cupom de troca real emitido na devolução para abater nova compra no checkout', () => {
    cy.esvaziarCarrinhoReal(clienteComTrocas.id)
      .then(() => cy.adicionarItemCarrinhoReal(clienteComTrocas.id, skuMaior.estoque.id, 1))
      .then(() => {
        cy.intercept('GET', `${apiUrl}/checkout/contexto`).as('carregarContexto');
        cy.intercept('GET', `${apiUrl}/cupons/validar/${cupomEmitidoNaTroca.codigo}`).as(
          'validarCupomTrocaReutilizado'
        );
        cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('finalizarNovaCompra');

        cy.visit(`checkout.html?id=${clienteComTrocas.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem('usuarioLogado', JSON.stringify(clienteComTrocas));
          }
        });

        cy.wait('@carregarContexto').then((ctxInterception) => {
          const totalNovaCompra = Number(ctxInterception.response.body.valorTotal);
          const descontoTroca = Number(cupomEmitidoNaTroca.valorDesconto);
          const saldoCartaoEsperado = Number((totalNovaCompra - descontoTroca).toFixed(2));

          cy.get('#btn-toggle-cupom').click();
          cy.get('#cupom-codigo').type(cupomEmitidoNaTroca.codigo);
          cy.get('#btn-aplicar-cupom').click();
          cy.wait('@validarCupomTrocaReutilizado').its('response.statusCode').should('eq', 200);

          cy.get('#resumo-desconto').should('contain', formatarBRL(descontoTroca));
          cy.get('#resumo-total').should('contain', formatarBRL(saldoCartaoEsperado));

          cy.get('.btn-submit').click();

          cy.wait('@finalizarNovaCompra').then((finInterception) => {
            expect(finInterception.request.body.codigosCupons).to.deep.equal([
              cupomEmitidoNaTroca.codigo
            ]);
            expect(finInterception.request.body.cartoes[0].valor).to.eq(saldoCartaoEsperado);
            expect(finInterception.response.statusCode).to.eq(200);
            expect(finInterception.response.body.status).to.eq('EmProcessamento');

            cy.get('.checkout-main')
              .should('contain', 'Compra finalizada com sucesso!')
              .and('contain', finInterception.response.body.codigo)
              .and('contain', formatarBRL(saldoCartaoEsperado));
          });
        });
      });
  });
});
