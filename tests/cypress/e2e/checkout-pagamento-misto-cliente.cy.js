/**
 * ===============================================================================
 * Teste E2E: Checkout com Pagamento Misto Cupom e Cartão (RN0035) - Cliente
 * Arquivo: tests/cypress/e2e/checkout-pagamento-misto-cliente.cy.js
 * ===============================================================================
 * Regra de Negócio RN0035:
 * - Quando há cupons aplicados e o saldo restante da compra for inferior a R$ 10,00,
 *   é permitido debitar valor inferior a R$ 10,00 no cartão de crédito (exceção à RN0034).
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout com pagamento misto cupom e cartão (RN0035) - Cliente', () => {
  const cliente = {
    id: 42,
    nome: 'Maria Silva',
    email: 'maria.silva@example.com'
  };

  const enderecoPadrao = {
    id: 10,
    usuarioId: 42,
    apelido: 'Casa',
    padrao: true,
    cep: '08700000',
    logradouro: 'Rua das Flores',
    numero: '123',
    bairro: 'Centro',
    cidade: 'Mogi das Cruzes',
    estado: 'SP'
  };

  const cartaoPadrao = {
    id: 5,
    usuarioId: 42,
    ultimosDigitos: '1234',
    bandeira: 'Mastercard',
    mesValidade: 12,
    anoValidade: 2028,
    padrao: true
  };

  const contextoInicial = {
    carrinho: {
      id: 1,
      quantidadeItens: 1,
      subtotal: 85.0,
      itens: [
        {
          id: 101,
          nomeProduto: 'Casaco Polar Térmico',
          tamanho: 'G',
          cor: 'Preto',
          sku: 'CAS-POL-G-PRT',
          precoUnitario: 85.0,
          quantidade: 1,
          estoqueDisponivel: 5,
          disponivel: true
        }
      ]
    },
    enderecoPrincipal: enderecoPadrao,
    valorFrete: 20.0,
    valorTotal: 105.0,
    cartoes: [cartaoPadrao]
  };

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: contextoInicial
    }).as('carregarContexto');

    cy.visit('checkout.html?id=42', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });

    cy.wait('@carregarContexto');
  });

  it('aplica cupom promocional e recalcula o saldo devedor reativamente', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 99,
        codigo: 'GLACIAR100',
        valorDesconto: 100.0,
        categoria: 'Promocional'
      }
    }).as('validarCupom');

    // Abre seção de cupom e aplica GLACIAR100
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('GLACIAR100');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom');

    // O resumo substitui impostos por desconto de R$ 100,00 e total vai para R$ 5,00
    cy.get('#resumo-desconto').should('contain', '100,00');
    cy.get('#resumo-total').should('contain', '5,00');

    // Campo de cobrança do cartão sincroniza automaticamente para R$ 5,00
    cy.get('.input-valor-cartao[data-cartao-id="5"]').should('have.value', '5.00');
  });

  it('permite cartão com valor inferior a R$ 10,00 quando houver cupom cobrindo o restante da compra (RN0035)', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 99,
        codigo: 'GLACIAR100',
        valorDesconto: 100.0,
        categoria: 'Promocional'
      }
    }).as('validarCupom');

    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      expect(req.body.codigosCupons).to.deep.equal(['GLACIAR100']);
      expect(req.body.cartoes).to.have.length(1);
      expect(req.body.cartoes[0].valor).to.eq(5.0); // Permitido pela RN0035

      req.reply({
        statusCode: 200,
        body: {
          id: 801,
          codigo: 'PED-801-RN0035',
          status: 'EmProcessamento',
          subtotal: 85.0,
          valorFrete: 20.0,
          valorAbatidoCupons: 100.0,
          valorTotal: 5.0,
          valorPagoCartoes: 5.0
        }
      });
    }).as('finalizarPedidoMisto');

    // Aplica o cupom
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('GLACIAR100');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom');

    // Finaliza compra com R$ 5,00 no cartão
    cy.get('.btn-submit').click();

    cy.wait('@finalizarPedidoMisto').then((interception) => {
      expect(interception.response.body.status).to.eq('EmProcessamento');
      expect(interception.response.body.valorTotal).to.eq(5.0);
    });

    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-801-RN0035')
      .and('contain', 'Valor Final:')
      .and('contain', '5,00');
  });
});
