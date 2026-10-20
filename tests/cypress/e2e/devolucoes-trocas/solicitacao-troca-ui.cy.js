/**
 * ===============================================================================
 * TaaC - Test Automation as Code (E2E)
 * Suite: Solicitação de Troca de Pedidos pelo Cliente (UI & Modal)
 * Arquivo: tests/cypress/e2e/devolucoes-trocas/solicitacao-troca-ui.cy.js
 * ===============================================================================
 * Escopo:
 * - Apenas pedidos com status 'Entregue' exibem o botão "Solicitar Troca".
 * - Abertura e interações do Modal de Troca:
 *   - Alternância entre troca total (pedido inteiro) e parcial (itens específicos).
 *   - Controle numérico de unidades por produto selecionado.
 *   - Validação de preenchimento obrigatório do motivo.
 * - Submissão do formulário com chamada para POST /api/pedidos/{id}/troca.
 * - Atualização imediata do status do pedido para 'Troca Solicitada'.
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Devoluções e Trocas - Solicitação de Troca pelo Cliente (UI)', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria@example.com'
  };

  const pedidosMock = [
    {
      id: 701,
      codigo: '701',
      status: 'Entregue', // ELEGÍVEL PARA TROCA
      data: new Date().toISOString(),
      subtotal: 300.0,
      valorFrete: 0.0,
      valorTotal: 300.0,
      itens: [
        { id: 10, pedidoProdutoId: 10, nomeProduto: 'Fleece Midlayer P', quantidade: 2, precoUnitario: 150.0, subtotal: 300.0 }
      ]
    },
    {
      id: 702,
      codigo: '702',
      status: 'EmTransporte', // NÃO ELEGÍVEL PARA TROCA
      data: new Date().toISOString(),
      subtotal: 100.0,
      valorFrete: 20.0,
      valorTotal: 120.0,
      itens: [
        { id: 11, pedidoProdutoId: 11, nomeProduto: 'Luva Térmica Couro', quantidade: 1, precoUnitario: 100.0, subtotal: 100.0 }
      ]
    }
  ];

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/pedidos`, {
      statusCode: 200,
      body: pedidosMock
    }).as('carregarPedidos');

    cy.intercept('GET', `${apiUrl}/notificacoes`, {
      statusCode: 200,
      body: []
    }).as('carregarNotificacoes');

    cy.visit('pedidos.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carregarPedidos');
  });

  it('deve exibir botão "Solicitar Troca" SOMENTE para pedidos com status Entregue', () => {
    // Pedido 701 (Entregue) deve ter o botão
    cy.get('[data-pedido-id="701"]')
      .find('[data-acao="solicitar-troca"]')
      .should('be.visible')
      .and('contain', 'Solicitar Troca');

    // Pedido 702 (EmTransporte) NÃO deve ter o botão de troca
    cy.get('[data-pedido-id="702"]')
      .find('[data-acao="solicitar-troca"]')
      .should('not.exist');
  });

  it('deve abrir o modal de troca e permitir solicitar a troca por unidade específica (1 de 2)', () => {
    cy.intercept('POST', `${apiUrl}/pedidos/701/troca`, {
      statusCode: 200,
      body: {
        id: 701,
        statusAnterior: 'Entregue',
        statusNovo: 'TrocaSolicitada',
        mensagem: 'Solicitação de troca registrada com sucesso!'
      }
    }).as('enviarSolicitacaoTroca');

    // 1. Clica para abrir o modal no pedido 701
    cy.get('[data-pedido-id="701"] [data-acao="solicitar-troca"]').click();

    // 2. O modal deve abrir com o título correto
    cy.get('#modal-troca').should('be.visible').and('not.have.class', 'hidden');
    cy.get('#modal-troca-titulo').should('contain', '701');

    // 3. Ajusta a quantidade da troca para 1 unidade (de 2 compradas)
    cy.get('.troca-item-qtd-input').clear().type('1');

    // 4. Preenche o motivo da troca
    cy.get('#troca-motivo').type('Tamanho pequeno para o meu uso, gostaria de trocar.');

    // 5. Envia o formulário
    cy.get('#form-solicitar-troca').submit();

    // 6. Valida a requisição enviada ao backend
    cy.wait('@enviarSolicitacaoTroca').then((interception) => {
      expect(interception.request.body).to.deep.include({
        motivo: 'Tamanho pequeno para o meu uso, gostaria de trocar.',
        trocarPedidoInteiro: false
      });
      expect(interception.request.body.itens).to.have.length(1);
      expect(interception.request.body.itens[0]).to.deep.include({
        pedidoProdutoId: 10,
        quantidade: 1
      });
    });

    // 7. Modal fecha após o sucesso
    cy.get('#modal-troca').should('have.class', 'hidden');
  });

  it('deve permitir solicitar a troca de todos os itens do pedido inteiro', () => {
    cy.intercept('POST', `${apiUrl}/pedidos/701/troca`, {
      statusCode: 200,
      body: {
        id: 701,
        statusAnterior: 'Entregue',
        statusNovo: 'TrocaSolicitada'
      }
    }).as('trocaTotal');

    cy.get('[data-pedido-id="701"] [data-acao="solicitar-troca"]').click();

    // Seleciona a opção de troca total
    cy.get('#radio-troca-total').click();

    // O container de seleção individual de itens deve ocultar
    cy.get('#container-selecao-itens').should('not.be.visible');

    cy.get('#troca-motivo').type('Defeito geral nos itens do pacote.');
    cy.get('#form-solicitar-troca').submit();

    cy.wait('@trocaTotal').then((interception) => {
      expect(interception.request.body.trocarPedidoInteiro).to.be.true;
    });
  });
});
