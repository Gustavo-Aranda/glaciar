/**
 * ===============================================================================
 * Teste E2E: Checkout com Troco em Cupom de Troca (RN0036) - Cliente
 * Arquivo: tests/cypress/e2e/checkout-troco-cupom-cliente.cy.js
 * ===============================================================================
 * Regra de Negócio RN0036:
 * - Se o valor somado dos cupons de troca superar o total da compra, a compra é fechada
 *   com valor a pagar R$ 0,00 e um novo cupom de troca é emitido com a diferença (troco).
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout com troco em cupom de troca (RN0036) - Cliente', () => {
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

  const contextoInicial = {
    carrinho: {
      id: 1,
      quantidadeItens: 1,
      subtotal: 80.0,
      itens: [
        {
          id: 101,
          nomeProduto: 'Casaco Polar Térmico',
          tamanho: 'G',
          cor: 'Preto',
          sku: 'CAS-POL-G-PRT',
          precoUnitario: 80.0,
          quantidade: 1,
          estoqueDisponivel: 5,
          disponivel: true
        }
      ]
    },
    enderecoPrincipal: enderecoPadrao,
    valorFrete: 20.0,
    valorTotal: 100.0,
    cartoes: [
      {
        id: 5,
        usuarioId: 42,
        ultimosDigitos: '1234',
        bandeira: 'Mastercard',
        mesValidade: 12,
        anoValidade: 2028,
        padrao: true
      }
    ]
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

  it('zera o saldo a pagar quando o cupom de troca cobre 100% da compra sem exigir cartão', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 88,
        codigo: 'TROCA150',
        valorDesconto: 150.0,
        categoria: 'Troca'
      }
    }).as('validarCupomTroca');

    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('TROCA150');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupomTroca');

    // Desconto exibe R$ 100,00 abatido e total vai para R$ 0,00
    cy.get('#resumo-desconto').should('contain', '100,00');
    cy.get('#resumo-total').should('contain', '0,00');
  });

  it('finaliza o pedido com sucesso e gera um novo cupom de troca com a diferença de troco (RN0036)', () => {
    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 88,
        codigo: 'TROCA150',
        valorDesconto: 150.0,
        categoria: 'Troca'
      }
    }).as('validarCupomTroca');

    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      expect(req.body.codigosCupons).to.deep.equal(['TROCA150']);
      expect(req.body.cartoes).to.be.an('array').that.is.empty;

      req.reply({
        statusCode: 200,
        body: {
          id: 901,
          codigo: 'PED-901-RN0036',
          status: 'EmProcessamento',
          subtotal: 80.0,
          valorFrete: 20.0,
          valorAbatidoCupons: 100.0,
          valorTotal: 0.0,
          valorPagoCartoes: 0.0,
          cupomTrocaGerado: {
            id: 777,
            codigo: 'TROCA-RESTO-50',
            valorDesconto: 50.0,
            categoria: 'Troca'
          }
        }
      });
    }).as('finalizarComTroco');

    // Aplica o cupom de troca
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('TROCA150');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupomTroca');

    // Finaliza compra
    cy.get('.btn-submit').click();

    cy.wait('@finalizarComTroco').then((interception) => {
      expect(interception.response.body.status).to.eq('EmProcessamento');
      expect(interception.response.body.valorTotal).to.eq(0.0);
      expect(interception.response.body.cupomTrocaGerado.valorDesconto).to.eq(50.0);
    });

    // Valida mensagem de sucesso e emissão do troco
    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-901-RN0036')
      .and('contain', 'Valor Final:')
      .and('contain', '0,00')
      .and('contain', 'Novo Cupom de Troca Gerado!')
      .and('contain', 'TROCA-RESTO-50')
      .and('contain', '50,00');
  });
});
