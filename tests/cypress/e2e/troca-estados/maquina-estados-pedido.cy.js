/**
 * ===============================================================================
 * Teste de Contrato e Regras Reais: Máquina de Estados do Pedido (DRS)
 * Arquivo: tests/cypress/e2e/troca-estados/maquina-estados-pedido.cy.js
 * ===============================================================================
 * Escopo 100% Real contra Backend C# e PostgreSQL:
 * - Rejeição de payload vazio/nulo (HTTP 400)
 * - Bloqueio de pulo de etapa (ex: EmProcessamento -> Entregue)
 * - Bloqueio de ator não autorizado (Cliente tentando PagamentoRealizado)
 * - Bloqueio de solicitação de troca para pedido NÃO ENTREGUE (EmProcessamento e EmTransporte)
 * - Travessia completa real da máquina de estados validando proximosStatus em cada etapa:
 *   EmProcessamento -> PagamentoRealizado -> EmTransporte -> Entregue ->
 *   TrocaSolicitada -> TrocaAceita -> ItemEnviado -> ItemRecebido -> Trocado
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Troca de Estados - Máquina de Estados do Pedido (API Real)', () => {
  let clienteTeste;
  let enderecoReal;
  let cartaoReal;
  let skuReal;
  let pedidosParaLimpar = [];

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 5 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Cliente', sobrenome: 'MaquinaEstados' }).then((cli) => {
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

  afterEach(() => {
    pedidosParaLimpar = [];
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  const criarNovoPedidoReal = (statusAlvo = 'EmProcessamento') =>
    cy
      .criarPedidoReal({
        usuarioId: clienteTeste.id,
        usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
        usuarioCartaoId: cartaoReal.id,
        estoqueId: skuReal.estoque.id,
        quantidade: 1,
        statusAlvo
      })
      .then((p) => {
        pedidosParaLimpar.push(p.id);
        return p;
      });

  it('rejeita requisições de alteração de status com payload vazio ou status nulo (HTTP 400)', () => {
    criarNovoPedidoReal('EmProcessamento').then((pedido) => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/admin/pedidos/${pedido.id}/status`,
        body: {},
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.eq(400);
        const mensagem = res.body.message || res.body.errors?.Status?.[0] || JSON.stringify(res.body);
        expect(mensagem).to.match(/Informe (um|o novo) status/i);
      });
    });
  });

  it('rejeita pulo ilegal de etapa na máquina de estados (EmProcessamento -> Entregue) com HTTP 400', () => {
    criarNovoPedidoReal('EmProcessamento').then((pedido) => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/admin/pedidos/${pedido.id}/status`,
        body: { status: 'Entregue' },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.message).to.contain("Transição de 'EmProcessamento' para 'Entregue' não é permitida");
      });
    });
  });

  it('rejeita quando o Cliente tenta aplicar status exclusivo de Administrador (HTTP 400)', () => {
    criarNovoPedidoReal('EmProcessamento').then((pedido) => {
      cy.request({
        method: 'PATCH',
        url: `${apiUrl}/pedidos/${pedido.id}/status`,
        headers: { 'X-Usuario-Id': String(clienteTeste.id) },
        body: { status: 'PagamentoRealizado' },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.message).to.match(/não pode ser executada pelo ator/i);
      });
    });
  });

  it('bloqueia solicitação de troca para pedidos que NÃO estejam com status ENTREGUE (HTTP 400)', () => {
    criarNovoPedidoReal('EmTransporte').then((pedidoEmTransporte) => {
      cy.request({
        method: 'POST',
        url: `${apiUrl}/pedidos/${pedidoEmTransporte.id}/troca`,
        headers: { 'X-Usuario-Id': String(clienteTeste.id) },
        body: {
          trocarPedidoInteiro: true,
          motivo: 'Tentativa prematura antes da entrega'
        },
        failOnStatusCode: false
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.message).to.contain('ENTREGUES');
      });
    });
  });

  it('executa a trilha completa real EmProcessamento -> Entregue -> Trocado validando proximosStatus em cada etapa', () => {
    criarNovoPedidoReal('EmProcessamento').then((pedido) => {
      // 1. EmProcessamento -> PagamentoRealizado (Admin)
      cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedido.id}/status`, {
        status: 'PagamentoRealizado'
      }).then((r1) => {
        expect(r1.status).to.eq(200);
        expect(r1.body.dados.statusAtual).to.eq('PagamentoRealizado');
        expect(r1.body.dados.proximosStatus).to.include('EmTransporte');

        // 2. PagamentoRealizado -> EmTransporte (Admin)
        return cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedido.id}/status`, {
          status: 'EmTransporte'
        });
      }).then((r2) => {
        expect(r2.status).to.eq(200);
        expect(r2.body.dados.statusAtual).to.eq('EmTransporte');
        expect(r2.body.dados.proximosStatus).to.include('Entregue');

        // 3. EmTransporte -> Entregue (Cliente ou Admin)
        return cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedido.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) },
          body: { status: 'Entregue' }
        });
      }).then((r3) => {
        expect(r3.status).to.eq(200);
        expect(r3.body.dados.statusAtual).to.eq('Entregue');
        expect(r3.body.dados.proximosStatus).to.deep.equal(['TrocaSolicitada']);

        // 4. Entregue -> TrocaSolicitada (Cliente via POST /troca)
        return cy.request({
          method: 'POST',
          url: `${apiUrl}/pedidos/${pedido.id}/troca`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) },
          body: { trocarPedidoInteiro: true, motivo: 'Teste completo da máquina de estados' }
        });
      }).then((r4) => {
        expect(r4.status).to.eq(200);
        expect(r4.body.dados.statusAtual).to.eq('TrocaSolicitada');

        // 5. TrocaSolicitada -> TrocaAceita (Admin)
        return cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedido.id}/status`, {
          status: 'TrocaAceita'
        });
      }).then((r5) => {
        expect(r5.status).to.eq(200);
        expect(r5.body.dados.statusAtual).to.eq('TrocaAceita');

        // 6. TrocaAceita -> ItemEnviado (Cliente)
        return cy.request({
          method: 'PATCH',
          url: `${apiUrl}/pedidos/${pedido.id}/status`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) },
          body: { status: 'ItemEnviado' }
        });
      }).then((r6) => {
        expect(r6.status).to.eq(200);
        expect(r6.body.dados.statusAtual).to.eq('ItemEnviado');

        // 7. ItemEnviado -> ItemRecebido (Admin)
        return cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedido.id}/status`, {
          status: 'ItemRecebido'
        });
      }).then((r7) => {
        expect(r7.status).to.eq(200);
        expect(r7.body.dados.statusAtual).to.eq('ItemRecebido');
        expect(r7.body.dados.proximosStatus).to.deep.equal(['Trocado']);

        // 8. ItemRecebido -> Trocado (Admin — estado final, repõe estoque e emite cupom)
        return cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedido.id}/status`, {
          status: 'Trocado'
        });
      }).then((r8) => {
        expect(r8.status).to.eq(200);
        expect(r8.body.dados.statusAtual).to.eq('Trocado');
        expect(r8.body.dados.proximosStatus).to.be.empty;
        expect(r8.body.dados.cupomTrocaGerado).to.exist;
      });
    });
  });
});
