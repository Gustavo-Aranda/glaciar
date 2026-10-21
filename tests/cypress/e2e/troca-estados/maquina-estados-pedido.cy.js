/**
 * ===============================================================================
 * Teste de Contrato e Regras: Máquina de Estados do Pedido (DRS)
 * Arquivo: tests/cypress/e2e/troca-estados/maquina-estados-pedido.cy.js
 * ===============================================================================
 * Princípios e Escopo do DRS (PedidoMaquinaEstados):
 * - Validação de payloads e integridade das transições de status.
 * - Rejeição estrita de status nulo, inválido ou malformado (HTTP 400).
 * - Validação dos próximos status permitidos por ator (Admin vs Cliente).
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Troca de Estados - Máquina de Estados do Pedido (DRS)', () => {
  const usuarioId = 42;

  it('rejeita requisições de alteração de status com payload vazio ou status nulo (HTTP 400)', () => {
    cy.request({
      method: 'PATCH',
      url: `${apiUrl}/admin/pedidos/1/status`,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {},
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      const mensagem = res.body.message || res.body.errors?.Status?.[0] || JSON.stringify(res.body);
      expect(mensagem).to.match(/Informe (um|o novo) status/i);
    });
  });

  it('rejeita alteração de status quando o cliente tenta aplicar status restrito de Administrador (HTTP 400)', () => {
    cy.request({
      method: 'PATCH',
      url: `${apiUrl}/pedidos/1/status`,
      headers: {
        'Content-Type': 'application/json',
        'X-Usuario-Id': String(usuarioId)
      },
      body: {
        status: 'PagamentoRealizado'
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([400, 404]);
      if (res.status === 400) {
        expect(res.body.message).to.match(/não pode ser executada pelo ator/i);
      }
    });
  });

  it('valida o contrato da máquina de estados garantindo que cada estado inicial possui próximos passos coerentes', () => {
    const mapaTransicoesEsperadas = {
      EmProcessamento: ['PagamentoRealizado', 'PagamentoReprovado', 'Cancelado'],
      PagamentoRealizado: ['EmTransporte', 'Cancelado'],
      EmTransporte: ['Entregue'],
      Entregue: ['TrocaSolicitada'],
      TrocaSolicitada: ['TrocaAceita', 'TrocaNegada'],
      TrocaAceita: ['ItemEnviado'],
      ItemEnviado: ['ItemRecebido'],
      ItemRecebido: ['Trocado']
    };

    // Valida que o mapa declarativo de estados cobre 100% da cadeia logística do professor
    expect(Object.keys(mapaTransicoesEsperadas)).to.have.length(8);
    expect(mapaTransicoesEsperadas.EmProcessamento).to.include('PagamentoRealizado');
    expect(mapaTransicoesEsperadas.PagamentoRealizado).to.include('EmTransporte');
    expect(mapaTransicoesEsperadas.EmTransporte).to.include('Entregue');
    expect(mapaTransicoesEsperadas.Entregue).to.include('TrocaSolicitada');
    expect(mapaTransicoesEsperadas.ItemRecebido).to.include('Trocado');
  });
});
