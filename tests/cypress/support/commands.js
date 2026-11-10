// ***********************************************
// Custom Commands e Utilitários de Integração Real — Glaciar E-Commerce
// ZERO MOCKS / ZERO STUBS: todas as operações batem na API C# (.NET) e PostgreSQL reais.
// ***********************************************

const API_URL_PADRAO = 'http://localhost:5205/api';

function obterApiUrl() {
  return Cypress.expose('apiUrl') || Cypress.env('apiUrl') || API_URL_PADRAO;
}

let contadorSequencial = 0;

function gerarCpfValido(deslocamento = 0) {
  contadorSequencial += 1;
  const semente = Date.now() + deslocamento * 97 + contadorSequencial * 13;
  const base = String(semente).slice(-9).padStart(9, '0').split('').map(Number);

  // Evita CPFs com todos os dígitos iguais (ex: 111111111)
  if (base.every((d) => d === base[0])) {
    base[8] = (base[8] + 1) % 10;
  }

  const calcularDigito = (quantidade) => {
    const soma = base
      .slice(0, quantidade)
      .reduce((total, digito, indice) => total + digito * (quantidade + 1 - indice), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(9);
  base.push(primeiro);
  const segundo = calcularDigito(10);
  return `${base.join('')}${segundo}`;
}

function gerarEmailUnico(prefixo = 'qa.glaciar') {
  contadorSequencial += 1;
  return `${prefixo}.${Date.now()}.${contadorSequencial}@glaciar.com`;
}

// Expor utilitários síncronos no namespace Cypress.glaciar para uso direto em qualquer spec
Cypress.glaciar = {
  obterApiUrl,
  gerarCpfValido,
  gerarEmailUnico,
  CARTOES_VALIDOS: {
    mastercard: {
      numero: '5158376442285253',
      ultimosDigitos: '5253',
      cvv: '765',
      bandeira: 'Mastercard',
      mesValidade: 7,
      anoValidade: 2028
    },
    visa: {
      numero: '4916511493269188',
      ultimosDigitos: '9188',
      cvv: '690',
      bandeira: 'Visa',
      mesValidade: 11,
      anoValidade: 2028
    }
  }
};

/**
 * Define a sessão do usuário autenticado no sessionStorage a partir de um registro REAL do banco
 */
Cypress.Commands.add('definirSessao', (usuario) => {
  if (!usuario || !usuario.id) {
    throw new Error('cy.definirSessao exige um objeto de usuário real com id válido.');
  }
  cy.window().then((win) => {
    win.mostrarLoadingUsuario = win.mostrarLoadingUsuario || (() => {});
    win.esconderLoadingUsuario = win.esconderLoadingUsuario || (() => {});
    win.sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
  });
});

/**
 * Realiza login REAL via UI batendo em POST /api/conta/login (cy.intercept usado apenas como spy)
 */
Cypress.Commands.add('loginCliente', (email, senha) => {
  const apiUrl = obterApiUrl();
  cy.intercept('POST', `${apiUrl}/conta/login`).as('loginRequest');

  cy.visit('login.html');
  cy.get('#email').clear().type(email);
  cy.get('#password').clear().type(senha);
  cy.get('#loginForm').submit();
  return cy.wait('@loginRequest');
});

/**
 * Consulta GET /api/conta real e retorna um cliente (CLI) ativo existente
 */
Cypress.Commands.add('obterClienteAtivoReal', () => {
  const apiUrl = obterApiUrl();
  return cy.request('GET', `${apiUrl}/conta`).then((res) => {
    expect(res.status).to.eq(200);
    const cliente = res.body.find(
      (u) => u.ativo === true && (u.tipoUsuario === 'CLI' || u.tipoUsuario === 0)
    );
    expect(cliente, 'cliente CLI ativo real na base').to.exist;
    return cliente;
  });
});

/**
 * Consulta GET /api/conta real e retorna um administrador (ADM) ativo existente
 */
Cypress.Commands.add('obterAdminAtivoReal', () => {
  const apiUrl = obterApiUrl();
  return cy.request('GET', `${apiUrl}/conta`).then((res) => {
    expect(res.status).to.eq(200);
    const admin = res.body.find(
      (u) => u.ativo === true && (u.tipoUsuario === 'ADM' || u.tipoUsuario === 1)
    );
    expect(admin, 'usuário ADM ativo real na base').to.exist;
    return admin;
  });
});

/**
 * Cadastra um cliente temporário real no banco via POST /api/conta/registrar
 */
Cypress.Commands.add('criarClienteTesteReal', (overrides = {}) => {
  const apiUrl = obterApiUrl();
  const cpf = overrides.cpf || gerarCpfValido();
  const email = overrides.email || gerarEmailUnico('cli');
  const senha = overrides.senha || 'Senha123!';

  const payload = {
    nome: overrides.nome || 'Cliente',
    sobrenome: overrides.sobrenome || 'TesteQA',
    cpf,
    email,
    telefone: overrides.telefone || '11987654321',
    senha,
    ...(overrides.tipoUsuario !== undefined ? { tipoUsuario: overrides.tipoUsuario } : {})
  };

  return cy.request('POST', `${apiUrl}/conta/registrar`, payload).then((res) => {
    expect(res.status).to.eq(201);
    return {
      ...res.body,
      cpf,
      email: res.body.email || email,
      senha
    };
  });
});

/**
 * Cadastra um endereço real vinculado ao cliente e retorna o vínculo completo (usuarioEnderecoId + enderecoId)
 */
Cypress.Commands.add('criarEnderecoReal', (usuarioId, overrides = {}) => {
  const apiUrl = obterApiUrl();
  const sufixo = String(Date.now()).slice(-6);
  const apelido = overrides.apelido || `Endereco QA ${sufixo}`;
  const payload = {
    usuarioId,
    cep: overrides.cep || '08780911',
    logradouro: overrides.logradouro || 'Avenida Vereador Narciso Yague Guimarães',
    numero: overrides.numero || '1001',
    complemento: overrides.complemento ?? 'Bloco A',
    bairro: overrides.bairro || 'Centro Cívico',
    cidade: overrides.cidade || 'Mogi das Cruzes',
    estado: overrides.estado || 'SP',
    apelido,
    padrao: overrides.padrao !== undefined ? overrides.padrao : true
  };

  return cy.request('POST', `${apiUrl}/enderecos`, payload).then((resCriacao) => {
    expect(resCriacao.status).to.eq(201);
    return cy.request('GET', `${apiUrl}/enderecos/cliente/${usuarioId}`).then((resLista) => {
      expect(resLista.status).to.eq(200);
      const vinculo =
        resLista.body.find((e) => (e.apelido || e.Apelido) === apelido) ||
        resLista.body[resLista.body.length - 1];
      expect(vinculo, 'vínculo de endereço persistido').to.exist;
      return {
        ...vinculo,
        usuarioEnderecoId: vinculo.id || vinculo.Id,
        enderecoId: vinculo.enderecoId || vinculo.EnderecoId
      };
    });
  });
});

/**
 * Cadastra um cartão de crédito real vinculado ao cliente
 */
Cypress.Commands.add('criarCartaoReal', (usuarioId, overrides = {}) => {
  const apiUrl = obterApiUrl();
  const baseCartao =
    overrides.variante === 'visa'
      ? Cypress.glaciar.CARTOES_VALIDOS.visa
      : Cypress.glaciar.CARTOES_VALIDOS.mastercard;

  const payload = {
    usuarioId,
    numero: overrides.numero || baseCartao.numero,
    cvv: overrides.cvv || baseCartao.cvv,
    bandeira: overrides.bandeira || baseCartao.bandeira,
    mesValidade: overrides.mesValidade || baseCartao.mesValidade,
    anoValidade: overrides.anoValidade || baseCartao.anoValidade,
    padrao: overrides.padrao !== undefined ? overrides.padrao : true
  };

  return cy.request('POST', `${apiUrl}/cartoes`, payload).then((res) => {
    expect(res.status).to.eq(201);
    return res.body;
  });
});

/**
 * Consulta catálogo e detalhes de produtos reais na base e seleciona um SKU com estoque físico suficiente
 */
Cypress.Commands.add('obterSkuComEstoqueReal', (opcoes = {}) => {
  const apiUrl = obterApiUrl();
  const {
    minEstoque = 3,
    precoExato = null,
    minPreco = null,
    maxPreco = null,
    categoriaNome = null,
    excluirProdutoIds = [],
    excluirEstoqueIds = []
  } = opcoes;

  return cy.request('GET', `${apiUrl}/produtos`).then((resProdutos) => {
    expect(resProdutos.status).to.eq(200);
    const candidatos = resProdutos.body.filter((p) => {
      if (excluirProdutoIds.includes(p.id)) return false;
      if (precoExato !== null && Number(p.preco) !== Number(precoExato)) return false;
      if (minPreco !== null && Number(p.preco) < Number(minPreco)) return false;
      if (maxPreco !== null && Number(p.preco) > Number(maxPreco)) return false;
      if (
        categoriaNome &&
        String(p.categoria || p.categoriaNome || '').toLowerCase() !== String(categoriaNome).toLowerCase()
      ) {
        return false;
      }
      return true;
    });

    expect(candidatos.length, 'produtos candidatos no catálogo real').to.be.greaterThan(0);

    let encontrado = null;
    cy.wrap(candidatos, { log: false }).each((prod) => {
      if (encontrado) return;
      cy.request('GET', `${apiUrl}/produtos/${prod.id}`).then((resDetalhe) => {
        if (encontrado) return;
        const detalhe = resDetalhe.body;
        const estoques = (detalhe.estoques || [])
          .map((e) => ({
            ...e,
            id: e.estoqueId ?? e.id,
            estoqueId: e.estoqueId ?? e.id
          }))
          .filter((e) => !excluirEstoqueIds.includes(e.id) && e.quantidade >= minEstoque)
          .sort((a, b) => b.quantidade - a.quantidade);

        if (estoques.length > 0) {
          encontrado = {
            produto: detalhe,
            estoque: estoques[0]
          };
        }
      });
    });

    return cy.then(() => {
      expect(encontrado, `SKU real com estoque >= ${minEstoque}`).to.not.be.null;
      return encontrado;
    });
  });
});

/**
 * Adiciona item real ao carrinho do cliente
 */
Cypress.Commands.add('adicionarItemCarrinhoReal', (usuarioId, estoqueId, quantidade = 1) => {
  const apiUrl = obterApiUrl();
  return cy
    .request({
      method: 'POST',
      url: `${apiUrl}/carrinho/itens`,
      headers: { 'X-Usuario-Id': String(usuarioId) },
      body: { estoqueId, quantidade }
    })
    .then((res) => {
      expect(res.status).to.eq(200);
      return res.body;
    });
});

/**
 * Esvazia o carrinho ativo do cliente (devolvendo imediatamente a reserva ao estoque físico)
 */
Cypress.Commands.add('esvaziarCarrinhoReal', (usuarioId) => {
  if (!usuarioId) return cy.wrap(null, { log: false });
  const apiUrl = obterApiUrl();
  return cy
    .request({
      method: 'GET',
      url: `${apiUrl}/carrinho`,
      headers: { 'X-Usuario-Id': String(usuarioId) },
      failOnStatusCode: false
    })
    .then((res) => {
      if (res.status === 200 && Array.isArray(res.body?.itens) && res.body.itens.length > 0) {
        const itensZerados = res.body.itens.map((item) => ({
          itemId: item.id ?? item.itemId,
          quantidade: 0
        }));
        return cy.request({
          method: 'PUT',
          url: `${apiUrl}/carrinho/itens`,
          headers: { 'X-Usuario-Id': String(usuarioId) },
          body: { itens: itensZerados },
          failOnStatusCode: false
        });
      }
      return null;
    });
});

/**
 * Avança um pedido real passo a passo pela máquina de estados real até o statusAlvo desejado
 */
Cypress.Commands.add('avancarPedidoParaStatusReal', (pedidoId, usuarioId, statusAlvo, motivoTroca = 'Ajuste de tamanho em equipamento outdoor') => {
  const apiUrl = obterApiUrl();

  const patchAdmin = (status) =>
    cy.request({
      method: 'PATCH',
      url: `${apiUrl}/admin/pedidos/${pedidoId}/status`,
      body: { status }
    });

  const patchCliente = (status) =>
    cy.request({
      method: 'PATCH',
      url: `${apiUrl}/pedidos/${pedidoId}/status`,
      headers: { 'X-Usuario-Id': String(usuarioId) },
      body: { status }
    });

  const solicitarTrocaTotal = () =>
    cy.request({
      method: 'POST',
      url: `${apiUrl}/pedidos/${pedidoId}/troca`,
      headers: { 'X-Usuario-Id': String(usuarioId) },
      body: { trocarPedidoInteiro: true, motivo: motivoTroca }
    });

  return cy
    .request({
      method: 'GET',
      url: `${apiUrl}/pedidos/${pedidoId}`,
      headers: { 'X-Usuario-Id': String(usuarioId) }
    })
    .then((resPedido) => {
      const atual = resPedido.body.status;
      if (atual === statusAlvo) return resPedido.body;

      if (statusAlvo === 'PagamentoReprovado' || statusAlvo === 'Cancelado') {
        return patchAdmin(statusAlvo).then(() =>
          cy
            .request({
              method: 'GET',
              url: `${apiUrl}/pedidos/${pedidoId}`,
              headers: { 'X-Usuario-Id': String(usuarioId) }
            })
            .its('body')
        );
      }

      const trilha = [
        'EmProcessamento',
        'PagamentoRealizado',
        'EmTransporte',
        'Entregue',
        'TrocaSolicitada',
        'TrocaAceita',
        'ItemEnviado',
        'ItemRecebido',
        'Trocado'
      ];

      if (statusAlvo === 'TrocaNegada') {
        return cy
          .avancarPedidoParaStatusReal(pedidoId, usuarioId, 'TrocaSolicitada', motivoTroca)
          .then(() => patchAdmin('TrocaNegada'))
          .then(() =>
            cy
              .request({
                method: 'GET',
                url: `${apiUrl}/pedidos/${pedidoId}`,
                headers: { 'X-Usuario-Id': String(usuarioId) }
              })
              .its('body')
          );
      }

      const idxAtual = trilha.indexOf(atual);
      const idxAlvo = trilha.indexOf(statusAlvo);
      expect(idxAtual, `status atual ${atual} na trilha`).to.be.gte(0);
      expect(idxAlvo, `status alvo ${statusAlvo} na trilha`).to.be.gte(idxAtual);

      const passos = trilha.slice(idxAtual + 1, idxAlvo + 1);
      cy.wrap(passos, { log: false }).each((passo) => {
        if (passo === 'PagamentoRealizado') return patchAdmin('PagamentoRealizado');
        if (passo === 'EmTransporte') return patchAdmin('EmTransporte');
        if (passo === 'Entregue') return patchAdmin('Entregue');
        if (passo === 'TrocaSolicitada') return solicitarTrocaTotal();
        if (passo === 'TrocaAceita') return patchAdmin('TrocaAceita');
        if (passo === 'ItemEnviado') return patchCliente('ItemEnviado');
        if (passo === 'ItemRecebido') return patchAdmin('ItemRecebido');
        if (passo === 'Trocado') return patchAdmin('Trocado');
      });

      return cy
        .request({
          method: 'GET',
          url: `${apiUrl}/pedidos/${pedidoId}`,
          headers: { 'X-Usuario-Id': String(usuarioId) }
        })
        .its('body');
    });
});

/**
 * Cria um pedido completo real via carrinho + checkout e opcionalmente o conduz até statusAlvo
 */
Cypress.Commands.add('criarPedidoReal', (opcoes) => {
  const apiUrl = obterApiUrl();
  const {
    usuarioId,
    usuarioEnderecoId,
    usuarioCartaoId,
    estoqueId,
    itens = null,
    quantidade = 1,
    codigosCupons = [],
    cartoesCustomizados = null,
    statusAlvo = 'EmProcessamento'
  } = opcoes;

  return cy.esvaziarCarrinhoReal(usuarioId).then(() => {
    const listaItens = itens || [{ estoqueId, quantidade }];
    cy.wrap(listaItens, { log: false }).each((item) => {
      cy.adicionarItemCarrinhoReal(usuarioId, item.estoqueId, item.quantidade || 1);
    });

    return cy
      .request({
        method: 'GET',
        url: `${apiUrl}/checkout/contexto`,
        headers: { 'X-Usuario-Id': String(usuarioId) }
      })
      .then((resCtx) => {
        expect(resCtx.status).to.eq(200);
        const endId = usuarioEnderecoId || resCtx.body.enderecoPrincipal?.id;
        const valorTotalBruto = Number(resCtx.body.valorTotal);

        const bodyCheckout = {
          usuarioEnderecoId: endId,
          codigosCupons,
          cartoes:
            cartoesCustomizados !== null
              ? cartoesCustomizados
              : [{ usuarioCartaoId, valor: valorTotalBruto }]
        };

        return cy
          .request({
            method: 'POST',
            url: `${apiUrl}/checkout/finalizar`,
            headers: { 'X-Usuario-Id': String(usuarioId) },
            body: bodyCheckout
          })
          .then((resCheckout) => {
            expect(resCheckout.status).to.eq(200);
            const pedidoCheckout = resCheckout.body;

            if (statusAlvo === 'EmProcessamento') {
              return cy
                .request({
                  method: 'GET',
                  url: `${apiUrl}/pedidos/${pedidoCheckout.id}`,
                  headers: { 'X-Usuario-Id': String(usuarioId) }
                })
                .then((resDetalhe) => ({
                  ...resDetalhe.body,
                  cupomTrocaGerado: pedidoCheckout.cupomTrocaGerado || resDetalhe.body.cupomTrocaGerado
                }));
            }

            return cy
              .avancarPedidoParaStatusReal(pedidoCheckout.id, usuarioId, statusAlvo)
              .then((pedidoFinal) => ({
                ...pedidoFinal,
                cupomTrocaGerado: pedidoFinal.cupomTrocaGerado || pedidoCheckout.cupomTrocaGerado
              }));
          });
      });
  });
});

/**
 * Restaura estoque de carrinhos/pedidos de um usuário de teste e remove (ou inativa se houver FK histórica) o registro
 */
Cypress.Commands.add('limparUsuarioTesteReal', (usuarioId) => {
  if (!usuarioId || usuarioId <= 2) {
    // Proteção absoluta contra exclusão dos usuários seed (id 1 e id 2)
    return cy.wrap(null, { log: false });
  }
  const apiUrl = obterApiUrl();

  return cy
    .esvaziarCarrinhoReal(usuarioId)
    .then(() =>
      cy.request({
        method: 'GET',
        url: `${apiUrl}/pedidos`,
        headers: { 'X-Usuario-Id': String(usuarioId) },
        failOnStatusCode: false
      })
    )
    .then((resPedidos) => {
      if (resPedidos.status === 200 && Array.isArray(resPedidos.body)) {
        cy.wrap(resPedidos.body, { log: false }).each((p) => {
          if (p.status === 'EmProcessamento') {
            cy.request({
              method: 'PATCH',
              url: `${apiUrl}/admin/pedidos/${p.id}/status`,
              body: { status: 'Cancelado' },
              failOnStatusCode: false
            });
          } else if (
            [
              'PagamentoRealizado',
              'EmTransporte',
              'Entregue',
              'TrocaSolicitada',
              'TrocaAceita',
              'ItemEnviado',
              'ItemRecebido'
            ].includes(p.status)
          ) {
            cy.avancarPedidoParaStatusReal(p.id, usuarioId, 'Trocado', 'Teardown automatizado QA');
          }
        });
      }
    })
    .then(() =>
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${usuarioId}`,
        failOnStatusCode: false
      })
    )
    .then((resDel) => {
      if (resDel.status !== 204) {
        // Caso o usuário possua Cupom ou Notificacao vinculada (FK NO ACTION), garante inativação
        return cy.request({
          method: 'PATCH',
          url: `${apiUrl}/conta/${usuarioId}/status`,
          body: { ativo: false },
          failOnStatusCode: false
        });
      }
      return null;
    });
});
