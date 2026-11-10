/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E & Integração 100% Real com PostgreSQL)
 * Módulo: Análise e Histórico Gráfico de Vendas por Categoria (Entrega 7)
 * Arquivo: tests/cypress/e2e/painel-analitico/admin-analise-grafico.cy.js
 * Sistema: Glaciar - Artigos e Vestuário de Montanhismo, Trekking e Outdoor
 * ===============================================================================
 * ZERO MOCKS: Todas as consultas (/categorias e /vendas-por-categoria) batem
 * diretamente no backend C# (.NET) e extraem agregações reais do PostgreSQL.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';
const formatarBRL = (valor) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);

function obterIntervaloRecente() {
  const hoje = new Date();
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));
  return {
    dataInicio: inicio.toISOString().split('T')[0],
    dataFim: fim.toISOString().split('T')[0]
  };
}

describe('Entrega 7 — Módulo de Análise Gráfica de Vendas (Glaciar Admin)', () => {
  let usuarioAdmin;
  let usuarioCliente;
  let categoriasReais = [];
  let clienteVendasAnalise;
  let enderecoAnalise;
  let cartaoAnalise;
  let skuEquipamentoReal;

  before(() => {
    cy.obterAdminAtivoReal().then((adm) => {
      usuarioAdmin = adm;
      return cy.request({
        method: 'GET',
        url: `${apiUrl}/admin/relatorios/categorias`,
        headers: {
          'X-Perfil-Usuario': 'ADM',
          'X-Usuario-Id': String(adm.id)
        }
      });
    }).then((resCat) => {
      expect(resCat.status).to.eq(200);
      categoriasReais = resCat.body;
      expect(categoriasReais.length).to.be.greaterThan(0);

      // Warm-up de conexão com o pooler PostgreSQL antes das medições estritas de latência (RNF0011)
      return cy.request({
        method: 'GET',
        url: `${apiUrl}/admin/relatorios/vendas-por-categoria?dataInicio=2026-06-01&dataFim=2026-11-06&categoriaIds=${categoriasReais[0].id}`,
        headers: {
          'X-Perfil-Usuario': 'ADM',
          'X-Usuario-Id': String(usuarioAdmin.id)
        }
      });
    });

    cy.obterClienteAtivoReal().then((cli) => {
      usuarioCliente = cli;
    });

    // Prepara cliente e SKU real da categoria Equipamentos para comprovar RN0074 no banco real
    cy.obterSkuComEstoqueReal({ minEstoque: 6, categoriaNome: 'Equipamentos' }).then((sku) => {
      skuEquipamentoReal = sku;
    });

    cy.criarClienteTesteReal({ nome: 'Analise', sobrenome: 'GraficaQA' }).then((cliTeste) => {
      clienteVendasAnalise = cliTeste;
      return cy
        .criarEnderecoReal(cliTeste.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoAnalise = end;
          return cy.criarCartaoReal(cliTeste.id, { padrao: true });
        })
        .then((cartao) => {
          cartaoAnalise = cartao;
        });
    });
  });

  after(() => {
    if (clienteVendasAnalise?.id) {
      cy.limparUsuarioTesteReal(clienteVendasAnalise.id);
    }
  });

  beforeEach(() => {
    // Spies puros (ZERO resposta forjada)
    cy.intercept('GET', `${apiUrl}/admin/relatorios/categorias`).as('obterCategorias');
    cy.intercept('GET', `${apiUrl}/admin/relatorios/vendas-por-categoria*`).as('consultaRelatorio');
  });

  function visitarTelaAnaliseComoAdmin() {
    cy.visit('http://127.0.0.1:5500/frontend/admin/analise.html', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(usuarioAdmin));
      }
    });
    cy.wait('@obterCategorias').its('response.statusCode').should('eq', 200);
    cy.wait('@consultaRelatorio').its('response.statusCode').should('eq', 200);
    cy.get('#financeChart').should('be.visible');
    // Pausa de 4 segundos na abertura para o professor ver o carregamento inicial das categorias e gráfico
    cy.wait(4000);
  }

  function selecionarCategorias(ids) {
    cy.get('#btn-limpar-categorias').should('be.visible').click();
    cy.get('#categorias-selector input[type="checkbox"]').should('not.be.checked');
    cy.get('#categorias-selector .category-chip').should('not.have.class', 'selected');

    ids.forEach((id) => {
      cy.get(`#categorias-selector label[data-categoria-id="${id}"]`).click();
      cy.get(`#categorias-selector input[value="${id}"]`).should('be.checked');
      cy.get(`#categorias-selector label[data-categoria-id="${id}"]`).should('have.class', 'selected');
    });

    cy.get('#categorias-selector input[type="checkbox"]:checked').should('have.length', ids.length);
  }

  function preencherDatasEClicarGerarGrafico(dataInicio, dataFim, aliasConsulta = '@consultaRelatorio') {
    cy.get('#data-inicio').clear().type(dataInicio);
    cy.get('#data-fim').clear().type(dataFim);
    cy.get('#btn-gerar-grafico').should('be.visible').and('not.be.disabled').click();
    return cy.wait(aliasConsulta).then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      return cy
        .get('#financeChart')
        .should('be.visible')
        .wait(4000)
        .then(() => interception.response.body);
    });
  }

  it('1. Consulta Real de Categoria Única: Plota valores reais de vendas ENTREGUES agrupadas por mês (RN0071)', () => {
    const catCalcados = categoriasReais.find((c) => c.nome === 'Calçados') || categoriasReais[0];

    visitarTelaAnaliseComoAdmin();
    selecionarCategorias([catCalcados.id]);

    categoriasReais
      .filter((c) => c.id !== catCalcados.id)
      .forEach((outra) => {
        cy.get(`#categorias-selector input[value="${outra.id}"]`).should('not.be.checked');
      });

    preencherDatasEClicarGerarGrafico('2026-06-01', '2026-11-06').then((relatorioReal) => {
      expect(relatorioReal.series).to.have.length(1);
      const serieReal = relatorioReal.series[0];

      cy.get('#kpi-total-geral').should('contain', formatarBRL(relatorioReal.valorTotalGeral));
      cy.get('#kpi-qtd-categorias').should('have.text', '1');
      cy.get('#kpi-periodo').should('contain', '06/2026 a 11/2026');

      cy.window().then((win) => {
        const chart = win.instanciaGrafico || win.Chart?.getChart('financeChart');
        expect(chart).to.not.be.null;
        expect(chart.data.datasets).to.have.length(1);
        expect(chart.data.datasets[0].label).to.eq(catCalcados.nome);
        expect(chart.data.datasets[0].data).to.deep.eq(serieReal.valores);
      });
    });
  });

  it('2. Comparação Multicategoria Real: Renderiza múltiplas linhas simultâneas do PostgreSQL com cores distintas (RF0055, RF0057)', () => {
    const tresCategorias = categoriasReais.slice(0, 3);
    const idsSelecionados = tresCategorias.map((c) => c.id);

    visitarTelaAnaliseComoAdmin();
    selecionarCategorias(idsSelecionados);

    preencherDatasEClicarGerarGrafico('2026-06-01', '2026-11-06').then((relatorioReal) => {
      cy.get('#kpi-qtd-categorias').should('have.text', String(idsSelecionados.length));
      cy.get('#kpi-total-geral').should('contain', formatarBRL(relatorioReal.valorTotalGeral));

      cy.window().then((win) => {
        const chart = win.instanciaGrafico || win.Chart?.getChart('financeChart');
        expect(chart.data.datasets).to.have.length(idsSelecionados.length);

        const nomesRenderizados = chart.data.datasets.map((d) => d.label);
        expect(nomesRenderizados).to.include.members(tresCategorias.map((c) => c.nome));

        const coresUnicas = new Set(chart.data.datasets.map((d) => d.borderColor));
        expect(coresUnicas.size).to.eq(idsSelecionados.length);
      });
    });
  });

  it('3. Isolamento Estrito de Status Real no Banco: Pedidos não ENTREGUES (EmProcessamento, PagamentoReprovado, EmTransporte) NÃO alteram o gráfico (RN0074)', () => {
    const catEquipamentos =
      categoriasReais.find((c) => c.nome === 'Equipamentos') || categoriasReais[categoriasReais.length - 1];
    const { dataInicio, dataFim } = obterIntervaloRecente();
    let totalBaselineReal;
    let pedidoEmProc;
    let pedidoEmTransp;

    visitarTelaAnaliseComoAdmin();
    selecionarCategorias([catEquipamentos.id]);

    // 1. Obtém baseline real de vendas ENTREGUES da categoria no banco
    preencherDatasEClicarGerarGrafico(dataInicio, dataFim, '@consultaRelatorio')
      .then((relatorioInicial) => {
        totalBaselineReal = Number(relatorioInicial.valorTotalGeral);

        // 2. Cria 3 pedidos reais em status NÃO ENTREGUES (EmProcessamento, PagamentoReprovado e EmTransporte)
        return cy.criarPedidoReal({
          usuarioId: clienteVendasAnalise.id,
          usuarioEnderecoId: enderecoAnalise.usuarioEnderecoId,
          usuarioCartaoId: cartaoAnalise.id,
          estoqueId: skuEquipamentoReal.estoque.id,
          quantidade: 1,
          statusAlvo: 'EmProcessamento'
        });
      })
      .then((p1) => {
        pedidoEmProc = p1;
        return cy.criarPedidoReal({
          usuarioId: clienteVendasAnalise.id,
          usuarioEnderecoId: enderecoAnalise.usuarioEnderecoId,
          usuarioCartaoId: cartaoAnalise.id,
          estoqueId: skuEquipamentoReal.estoque.id,
          quantidade: 1,
          statusAlvo: 'PagamentoReprovado'
        });
      })
      .then(() =>
        cy.criarPedidoReal({
          usuarioId: clienteVendasAnalise.id,
          usuarioEnderecoId: enderecoAnalise.usuarioEnderecoId,
          usuarioCartaoId: cartaoAnalise.id,
          estoqueId: skuEquipamentoReal.estoque.id,
          quantidade: 1,
          statusAlvo: 'EmTransporte'
        })
      )
      .then((p3) => {
        pedidoEmTransp = p3;

        // 3. Reconsulta o gráfico real no PostgreSQL e comprova que NENHUM desses pedidos entrou na soma!
        selecionarCategorias([catEquipamentos.id]);
        return preencherDatasEClicarGerarGrafico(dataInicio, dataFim, '@consultaRelatorio');
      })
      .then((relatorioPosNaoEntregues) => {
        expect(Number(relatorioPosNaoEntregues.valorTotalGeral)).to.eq(
          totalBaselineReal,
          'Pedidos em EmProcessamento, PagamentoReprovado ou EmTransporte jamais devem compor o gráfico (RN0074)'
        );
        cy.get('#kpi-total-geral').should('contain', formatarBRL(totalBaselineReal));

        // Cleanup imediato restaurando estoque físico
        cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedidoEmProc.id}/status`, {
          status: 'Cancelado'
        });
        cy.avancarPedidoParaStatusReal(pedidoEmTransp.id, clienteVendasAnalise.id, 'Trocado');
      });
  });

  it('4. Reflexo Dinâmico Real: Pedido recém-transicionado para ENTREGUE soma imediatamente no gráfico (RN0074)', () => {
    const catEquipamentos =
      categoriasReais.find((c) => c.nome === 'Equipamentos') || categoriasReais[categoriasReais.length - 1];
    const { dataInicio, dataFim } = obterIntervaloRecente();
    const precoItem = Number(skuEquipamentoReal.produto.preco);
    let totalAntesEntrega;
    let pedidoTeste;

    // 1. Cria pedido real inicialmente em EmTransporte (ainda fora do gráfico)
    cy.criarPedidoReal({
      usuarioId: clienteVendasAnalise.id,
      usuarioEnderecoId: enderecoAnalise.usuarioEnderecoId,
      usuarioCartaoId: cartaoAnalise.id,
      estoqueId: skuEquipamentoReal.estoque.id,
      quantidade: 1,
      statusAlvo: 'EmTransporte'
    })
      .then((p) => {
        pedidoTeste = p;

        visitarTelaAnaliseComoAdmin();
        selecionarCategorias([catEquipamentos.id]);
        return preencherDatasEClicarGerarGrafico(dataInicio, dataFim);
      })
      .then((relatorioAntes) => {
        totalAntesEntrega = Number(relatorioAntes.valorTotalGeral);
        cy.get('#kpi-total-geral').should('contain', formatarBRL(totalAntesEntrega));

        // 2. Transiciona o pedido REAL no PostgreSQL para ENTREGUE!
        return cy.request('PATCH', `${apiUrl}/admin/pedidos/${pedidoTeste.id}/status`, {
          status: 'Entregue'
        });
      })
      .then((resPatch) => {
        expect(resPatch.status).to.eq(200);

        // 3. Clica em "Gerar Gráfico" e comprova incremento exato de +precoItem na agregação real do banco!
        cy.get('#btn-gerar-grafico').click();
        return cy.wait('@consultaRelatorio').its('response.body');
      })
      .then((relatorioDepois) => {
        const totalEsperado = Number((totalAntesEntrega + precoItem).toFixed(2));
        expect(Number(relatorioDepois.valorTotalGeral)).to.eq(totalEsperado);
        cy.get('#kpi-total-geral').should('contain', formatarBRL(totalEsperado));

        // Pausa intencional de 4 segundos para demonstrar o salto do valor após a entrega
        cy.wait(4000);

        // Teardown: avança pedido de Entregue até Trocado para devolver estoque físico e restaurar baseline!
        cy.avancarPedidoParaStatusReal(pedidoTeste.id, clienteVendasAnalise.id, 'Trocado');
      });
  });

  it('5. Controle de Acesso Real (RBAC): Permite Admin e bloqueia cliente comum na tela e na API (HTTP 403)', () => {
    cy.visit('http://127.0.0.1:5500/frontend/admin/analise.html', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(usuarioCliente));
      }
    });
    cy.url().should('include', 'login.html');

    cy.request({
      method: 'GET',
      url: `${apiUrl}/admin/relatorios/categorias`,
      headers: {
        'X-Perfil-Usuario': 'CLI',
        'X-Usuario-Id': String(usuarioCliente.id)
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(403);
      expect(res.body.message).to.match(/perfil admin/i);
    });

    cy.request({
      method: 'GET',
      url: `${apiUrl}/admin/relatorios/categorias`,
      headers: {
        'X-Perfil-Usuario': 'ADM',
        'X-Usuario-Id': String(usuarioAdmin.id)
      }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array').and.not.be.empty;
    });
  });

  it('6. Validação de Performance Real contra PostgreSQL: Tempo de resposta <= 1000ms (RNF0011)', () => {
    const queryIds = categoriasReais
      .slice(0, 2)
      .map((c) => `categoriaIds=${c.id}`)
      .join('&');

    cy.request({
      method: 'GET',
      url: `${apiUrl}/admin/relatorios/vendas-por-categoria?dataInicio=2026-01-01&dataFim=2026-11-06&${queryIds}`,
      headers: {
        'X-Perfil-Usuario': 'ADM',
        'X-Usuario-Id': String(usuarioAdmin.id)
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      const tempoRespostaMs = response.duration;
      cy.log(`Tempo de resposta real da query analítica:  ${tempoRespostaMs} ms`);
      expect(tempoRespostaMs).to.be.lte(
        1000,
        `RNF0011: Consulta gerencial respondeu em ${tempoRespostaMs}ms (limite: 1000ms)`
      );
    });

    visitarTelaAnaliseComoAdmin();
    selecionarCategorias(categoriasReais.slice(0, 2).map((c) => c.id));
    preencherDatasEClicarGerarGrafico('2026-01-01', '2026-11-06');
  });
});
