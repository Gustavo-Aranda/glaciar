/**
 * ===============================================================================
 * Teste de Integração Direta de API: Catálogo, Carrinho e Regras de Checkout
 * Arquivo: tests/cypress/e2e/checkout-vendas-clientes/checkout-vendas-api.cy.js
 * ===============================================================================
 * Escopo 100% Real no PostgreSQL:
 * - Bloqueio de adição no carrinho acima do estoque físico real disponível
 * - Rejeição sem header X-Usuario-Id (HTTP 400)
 * - RN0033: Bloqueio de 2 cupons promocionais na mesma compra
 * - RN0034: Bloqueio estrito de cartão < R$ 10,00 sem cupom (com carrinho real preenchido!)
 * - Bloqueio de saldo devedor sem cartões informados e cartão com valor <= 0
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout e Vendas - Regras e Contratos Reais de API', () => {
  let clienteTeste;
  let enderecoReal;
  let cartao1;
  let cartao2;
  let skuReal;
  let valorTotalContexto;

  before(() => {
    cy.obterSkuComEstoqueReal({ minEstoque: 4 }).then((res) => {
      skuReal = res;
    });

    cy.criarClienteTesteReal({ nome: 'Cliente', sobrenome: 'CheckoutAPI' }).then((cli) => {
      clienteTeste = cli;
      return cy
        .criarEnderecoReal(cli.id, { estado: 'SP', padrao: true })
        .then((end) => {
          enderecoReal = end;
          return cy.criarCartaoReal(cli.id, { variante: 'mastercard', padrao: true });
        })
        .then((c1) => {
          cartao1 = c1;
          return cy.criarCartaoReal(cli.id, { variante: 'visa', padrao: false });
        })
        .then((c2) => {
          cartao2 = c2;
        });
    });
  });

  beforeEach(() => {
    cy.esvaziarCarrinhoReal(clienteTeste.id)
      .then(() => cy.adicionarItemCarrinhoReal(clienteTeste.id, skuReal.estoque.id, 1))
      .then(() =>
        cy.request({
          method: 'GET',
          url: `${apiUrl}/checkout/contexto`,
          headers: { 'X-Usuario-Id': String(clienteTeste.id) }
        })
      )
      .then((resCtx) => {
        expect(resCtx.status).to.eq(200);
        valorTotalContexto = Number(resCtx.body.valorTotal);
      });
  });

  afterEach(() => {
    if (clienteTeste?.id) {
      cy.esvaziarCarrinhoReal(clienteTeste.id);
    }
  });

  after(() => {
    if (clienteTeste?.id) {
      cy.limparUsuarioTesteReal(clienteTeste.id);
    }
  });

  it('rejeita requisições sem o header obrigatório X-Usuario-Id no checkout (HTTP 400)', () => {
    cy.request({
      method: 'GET',
      url: `${apiUrl}/checkout/contexto`,
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.contain('X-Usuario-Id');
    });
  });

  it('bloqueia adição ao carrinho de quantidade superior ao estoque físico real disponível no banco (HTTP 400)', () => {
    cy.request('GET', `${apiUrl}/produtos/${skuReal.produto.id}`).then((resProd) => {
      const skuAtual = resProd.body.estoques.find(
        (e) => (e.estoqueId ?? e.id) === skuReal.estoque.id
      );
      const qtdAcimaDoEstoque = skuAtual.quantidade + 50;

      cy.request({
        method: 'POST',
        url: `${apiUrl}/carrinho/itens`,
        headers: { 'X-Usuario-Id': String(clienteTeste.id) },
        body: {
          estoqueId: skuReal.estoque.id,
          quantidade: qtdAcimaDoEstoque
        },
        failOnStatusCode: false
      }).then((resErro) => {
        expect(resErro.status).to.eq(400);
        const msg = resErro.body.message || resErro.body.erro || JSON.stringify(resErro.body);
        expect(msg).to.match(/estoque|insuficiente|disponível/i);
      });
    });
  });

  it('valida RN0033 no backend rejeitando 2 cupons promocionais na mesma compra (HTTP 400)', () => {
    const saldoApos50 = Number((valorTotalContexto - 50.0).toFixed(2));

    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: { 'X-Usuario-Id': String(clienteTeste.id) },
      body: {
        usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
        codigosCupons: ['PROMO20', 'PROMO30'],
        cartoes: [{ usuarioCartaoId: cartao1.id, valor: saldoApos50 }]
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.match(/promocional/i);
    });
  });

  it('valida RN0034 no backend rejeitando cartão com valor < R$ 10,00 sem cupom aplicado (HTTP 400)', () => {
    const valorCartao1 = Number((valorTotalContexto - 5.0).toFixed(2));

    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: { 'X-Usuario-Id': String(clienteTeste.id) },
      body: {
        usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
        codigosCupons: [],
        cartoes: [
          { usuarioCartaoId: cartao1.id, valor: valorCartao1 },
          { usuarioCartaoId: cartao2.id, valor: 5.0 }
        ]
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.contain('10,00');
    });
  });

  it('rejeita finalização de compra real quando o saldo devedor não possui cartões informados (HTTP 400)', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: { 'X-Usuario-Id': String(clienteTeste.id) },
      body: {
        usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
        codigosCupons: [],
        cartoes: []
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.match(/Nenhum cartão informado/i);
    });
  });

  it('rejeita cartão com valor zero ou negativo no checkout real (HTTP 400)', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/checkout/finalizar`,
      headers: { 'X-Usuario-Id': String(clienteTeste.id) },
      body: {
        usuarioEnderecoId: enderecoReal.usuarioEnderecoId,
        codigosCupons: [],
        cartoes: [
          { usuarioCartaoId: cartao1.id, valor: valorTotalContexto },
          { usuarioCartaoId: cartao2.id, valor: 0.0 }
        ]
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message).to.match(/maior que zero/i);
    });
  });
});
