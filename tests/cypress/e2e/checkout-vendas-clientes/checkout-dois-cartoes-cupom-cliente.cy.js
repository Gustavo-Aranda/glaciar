/**
 * ===============================================================================
 * Teste E2E: Checkout com Dois Cartões e Cupom de Desconto - Cliente
 * Arquivo: tests/cypress/e2e/checkout-dois-cartoes-cupom-cliente.cy.js
 * ===============================================================================
 * Regras de Negócio Validadas:
 * - RN0033: Aplicação de cupom com recálculo reativo do saldo restante da compra.
 * - RN0034: Pagamento multimeios com divisão do saldo entre cartões de crédito
 *           respeitando o piso mínimo de R$ 10,00 por cartão.
 *
 * Cenários:
 * 1. Happy Path: Compra finalizada com 2 cartões vinculados + 1 cupom promocional.
 * 2. Happy Path: Compra finalizada com 1 cartão vinculado + 1 novo cartão cadastrado na hora + cupom.
 * 3. Unhappy Path: Bloqueio quando a soma dos dois cartões não cobre o saldo devedor restante após o cupom.
 * 4. Unhappy Path: Bloqueio quando algum dos cartões tiver valor inferior a R$ 10,00 (RN0034).
 * ===============================================================================
 */

const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Checkout com dois cartões e cupom de desconto - Cliente', () => {
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

  const cartao1 = {
    id: 5,
    usuarioId: 42,
    ultimosDigitos: '1234',
    bandeira: 'Mastercard',
    mesValidade: 12,
    anoValidade: 2028,
    padrao: true
  };

  const cartao2 = {
    id: 6,
    usuarioId: 42,
    ultimosDigitos: '5678',
    bandeira: 'Visa',
    mesValidade: 8,
    anoValidade: 2029,
    padrao: false
  };

  const contextoComDoisCartoes = {
    carrinho: {
      id: 1,
      quantidadeItens: 1,
      subtotal: 130.0,
      itens: [
        {
          id: 105,
          nomeProduto: 'Jaqueta Térmica Glaciar Impermeável',
          tamanho: 'G',
          cor: 'Azul Petróleo',
          sku: 'JAQ-GLA-G-AZL',
          precoUnitario: 130.0,
          quantidade: 1,
          estoqueDisponivel: 10,
          disponivel: true
        }
      ]
    },
    enderecoPrincipal: enderecoPadrao,
    valorFrete: 20.0,
    valorTotal: 150.0,
    cartoes: [cartao1, cartao2]
  };

  const visitarComSessao = (url = 'checkout.html?id=42') => {
    cy.visit(url, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cliente));
      }
    });
  };

  beforeEach(() => {
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: contextoComDoisCartoes
    }).as('carregarContexto');

    visitarComSessao();
    cy.wait('@carregarContexto');
  });

  it('permite realizar a compra dividindo o saldo entre dois cartões vinculados após aplicar cupom (Happy Path)', () => {
    // 1. Mock da validação do cupom promocional
    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 50,
        codigo: 'PROMO50',
        valorDesconto: 50.0,
        categoria: 'Promocional'
      }
    }).as('validarCupom');

    // 2. Mock do endpoint de finalização de compra
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      // Valida que o cupom foi enviado no array de códigos de cupom
      expect(req.body.codigosCupons).to.deep.equal(['PROMO50']);

      // Valida que foram enviados exatamente 2 cartões
      expect(req.body.cartoes).to.have.length(2);

      // Cartão 1: R$ 60,00
      expect(req.body.cartoes[0].usuarioCartaoId).to.eq(5);
      expect(req.body.cartoes[0].valor).to.eq(60.0);

      // Cartão 2: R$ 40,00
      expect(req.body.cartoes[1].usuarioCartaoId).to.eq(6);
      expect(req.body.cartoes[1].valor).to.eq(40.0);

      req.reply({
        statusCode: 200,
        body: {
          id: 950,
          codigo: 'PED-950-DOISCUPOM',
          status: 'EmProcessamento',
          subtotal: 130.0,
          valorFrete: 20.0,
          valorAbatidoCupons: 50.0,
          valorTotal: 100.0,
          valorPagoCartoes: 100.0
        }
      });
    }).as('finalizarComDoisCartoesECupom');

    // 3. Aplica o cupom de desconto
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom');

    // Verifica que o resumo foi atualizado reativamente
    cy.get('#resumo-desconto').should('contain', '50,00');
    cy.get('#resumo-total').should('contain', '100,00');

    // 4. Distribui o valor restante (R$ 100,00) entre os dois cartões vinculados
    // Cartão 1: R$ 60,00 / Cartão 2: R$ 40,00 (ambos >= R$ 10,00, atendendo a RN0034)
    cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type('60.00');
    cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type('40.00');

    // 5. Finaliza a compra
    cy.get('.btn-submit').click();

    // 6. Confirma a requisição e a resposta da API
    cy.wait('@finalizarComDoisCartoesECupom').then((interception) => {
      expect(interception.response.body.status).to.eq('EmProcessamento');
      expect(interception.response.body.valorAbatidoCupons).to.eq(50.0);
      expect(interception.response.body.valorTotal).to.eq(100.0);
    });

    // 7. Valida a tela de confirmação de compra
    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-950-DOISCUPOM')
      .and('contain', 'Desconto Aplicado: -R$ 50,00')
      .and('contain', '100,00');
  });

  it('permite pagar com 1 cartão vinculado e 1 novo cartão cadastrado na hora mais o cupom (Happy Path)', () => {
    // Contexto com apenas 1 cartão previamente salvo
    cy.intercept('GET', `${apiUrl}/checkout/contexto`, {
      statusCode: 200,
      body: {
        ...contextoComDoisCartoes,
        cartoes: [cartao1]
      }
    }).as('carregarContextoUmCartao');

    visitarComSessao();
    cy.wait('@carregarContextoUmCartao');

    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 50,
        codigo: 'PROMO50',
        valorDesconto: 50.0,
        categoria: 'Promocional'
      }
    }).as('validarCupom');

    cy.intercept('POST', `${apiUrl}/checkout/finalizar`, (req) => {
      expect(req.body.codigosCupons).to.deep.equal(['PROMO50']);
      expect(req.body.cartoes).to.have.length(2);

      // Cartão 1: vinculado existente
      expect(req.body.cartoes[0].usuarioCartaoId).to.eq(5);
      expect(req.body.cartoes[0].valor).to.eq(50.0);

      // Cartão 2: novo cartão preenchido no formulário
      const novo = req.body.cartoes[1];
      expect(novo.usuarioCartaoId).to.be.null;
      expect(novo.valor).to.eq(50.0);
      expect(novo.novoCartao).to.not.be.null;
      expect(novo.novoCartao.bandeira).to.eq('Visa');
      expect(novo.novoCartao.numero).to.eq('4916511493269188');
      expect(novo.novoCartao.mesValidade).to.eq(11);
      expect(novo.novoCartao.anoValidade).to.eq(2028);
      expect(novo.novoCartao.cvv).to.eq('123');

      req.reply({
        statusCode: 200,
        body: {
          id: 951,
          codigo: 'PED-951-MISTOCARTOES',
          status: 'EmProcessamento',
          subtotal: 130.0,
          valorFrete: 20.0,
          valorAbatidoCupons: 50.0,
          valorTotal: 100.0,
          valorPagoCartoes: 100.0
        }
      });
    }).as('finalizarComNovoCartao');

    // Aplica cupom
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom');

    // Define R$ 50,00 no cartão vinculado
    cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type('50.00');

    // Abre formulário para adicionar novo cartão
    cy.get('#btn-toggle-cartao').click();
    cy.get('#novo-cartao-form').should('have.class', 'active');

    // Preenche dados do novo cartão com R$ 50,00
    cy.get('#cartao-nome').type('Maria Silva');
    cy.get('#cartao-bandeira').select('Visa');
    cy.get('#cartao-numero').type('4916 5114 9326 9188');
    cy.get('#cartao-mes').type('11');
    cy.get('#cartao-ano').type('2028');
    cy.get('#cartao-cvv').type('123');
    cy.get('#novo-cartao-valor').clear().type('50.00');

    // Finaliza compra
    cy.get('.btn-submit').click();

    cy.wait('@finalizarComNovoCartao').its('response.body.status').should('eq', 'EmProcessamento');

    cy.get('.checkout-main')
      .should('contain', 'Compra finalizada com sucesso! 🎉')
      .and('contain', 'PED-951-MISTOCARTOES')
      .and('contain', '100,00');
  });

  it('bloqueia pagamento quando a soma dos dois cartões for inferior ao saldo devedor restante após o cupom (Unhappy Path)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');

    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 50,
        codigo: 'PROMO50',
        valorDesconto: 50.0,
        categoria: 'Promocional'
      }
    }).as('validarCupom');

    // Aplica cupom de R$ 50,00 (saldo restante: R$ 100,00)
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom');

    // Informa valores insuficientes: R$ 40,00 + R$ 30,00 = R$ 70,00 (< R$ 100,00)
    cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type('40.00');
    cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type('30.00');

    cy.get('.btn-submit').click();

    // Valida mensagem de bloqueio no toast
    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'O total nos cartões (R$ 70,00) é inferior ao valor restante do pedido (R$ 100,00).');

    // Nenhuma requisição deve ter sido disparada
    cy.get('@tentativaEnvio.all').should('have.length', 0);
  });

  it('bloqueia pagamento quando qualquer um dos dois cartões tiver valor inferior a R$ 10,00 com saldo >= R$ 10,00 (RN0034 - Unhappy Path)', () => {
    cy.intercept('POST', `${apiUrl}/checkout/finalizar`).as('tentativaEnvio');

    cy.intercept('GET', `${apiUrl}/cupons/validar/*`, {
      statusCode: 200,
      body: {
        id: 50,
        codigo: 'PROMO50',
        valorDesconto: 50.0,
        categoria: 'Promocional'
      }
    }).as('validarCupom');

    // Aplica cupom de R$ 50,00 (saldo restante: R$ 100,00)
    cy.get('#btn-toggle-cupom').click();
    cy.get('#cupom-codigo').type('PROMO50');
    cy.get('#btn-aplicar-cupom').click();
    cy.wait('@validarCupom');

    // Divide em R$ 95,00 no Cartão 1 e R$ 5,00 no Cartão 2 (R$ 5,00 viola a RN0034)
    cy.get('.input-valor-cartao[data-cartao-id="5"]').clear().type('95.00');
    cy.get('.input-valor-cartao[data-cartao-id="6"]').clear().type('5.00');

    cy.get('.btn-submit').click();

    // Mensagem de bloqueio do piso mínimo de R$ 10,00
    cy.get('.toast-error')
      .should('be.visible')
      .and('contain', 'O valor mínimo por cartão de crédito é R$ 10,00.');

    // Nenhuma requisição deve ter sido disparada
    cy.get('@tentativaEnvio.all').should('have.length', 0);
  });
});
