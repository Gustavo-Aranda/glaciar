const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

describe('Inativar cadastro de Cliente (C e A)', () => {
  let idsUsuariosParaLimpar = [];

  afterEach(() => {
    idsUsuariosParaLimpar.reverse().forEach((id) => {
      cy.limparUsuarioTesteReal(id);
    });
    idsUsuariosParaLimpar = [];
  });

  it('recusa o login real de uma conta de cliente inativada no banco', () => {
    cy.criarClienteTesteReal({ nome: 'Conta', sobrenome: 'InativadaLogin' }).then((cli) => {
      idsUsuariosParaLimpar.push(cli.id);

      cy.request('PATCH', `${apiUrl}/conta/${cli.id}/status`, { ativo: false }).then((resPatch) => {
        expect(resPatch.status).to.eq(200);
        expect(resPatch.body.ativo).to.be.false;
      });

      cy.intercept('POST', `${apiUrl}/conta/login`).as('loginContaInativada');

      cy.visit('login.html');
      cy.get('#email').type(cli.email);
      cy.get('#password').type(cli.senha);
      cy.get('#loginForm').submit();

      cy.wait('@loginContaInativada').its('response.statusCode').should('eq', 401);
      cy.get('#mensagem-login')
        .should('be.visible')
        .and('contain', 'inativada');
      cy.location('pathname').should('eq', '/frontend/user/login.html');
    });
  });

  it('inativa o cadastro do cliente pela tela de perfil e redireciona para o login', () => {
    cy.criarClienteTesteReal({ nome: 'Maria', sobrenome: 'AutoInativar' }).then((cli) => {
      idsUsuariosParaLimpar.push(cli.id);

      cy.intercept('PATCH', `${apiUrl}/conta/${cli.id}/status`).as('inativarCliente');

      cy.visit(`editar-perfil.html?id=${cli.id}`, {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('usuarioLogado', JSON.stringify(cli));
          win.mostrarLoadingUsuario = () => {};
          win.esconderLoadingUsuario = () => {};
        }
      });

      cy.get('#btn-inativar-conta').click();
      cy.get('#modal-inativar-conta').should('be.visible');
      cy.get('#btn-confirmar-inativacao').click();

      cy.wait('@inativarCliente').then((interception) => {
        expect(interception.request.body).to.deep.equal({ ativo: false });
        expect(interception.response.statusCode).to.eq(200);
      });
      cy.location('pathname').should('eq', '/frontend/user/login.html');

      cy.request('GET', `${apiUrl}/conta/${cli.id}`).its('body.ativo').should('eq', false);
    });
  });

  it('Inativar cadastro de Cliente (A) pelo painel administrativo', () => {
    cy.criarClienteTesteReal({ nome: 'Cliente', sobrenome: 'InativarAdmin' }).then((cli) => {
      idsUsuariosParaLimpar.push(cli.id);

      cy.intercept('GET', `${apiUrl}/conta`).as('listarClientes');
      cy.intercept('PATCH', `${apiUrl}/conta/${cli.id}/status`).as('inativarClienteAdmin');

      cy.visit('http://127.0.0.1:5500/frontend/admin/clientes.html');
      cy.wait('@listarClientes').its('response.statusCode').should('eq', 200);

      cy.contains('article.admin-card', cli.email)
        .find('.btn-warning')
        .click();

      cy.get('#modal-status-cliente').should('be.visible');
      cy.get('#btn-confirmar-status').click();

      cy.wait('@inativarClienteAdmin').then((interception) => {
        expect(interception.request.body).to.deep.equal({ ativo: false });
        expect(interception.response.statusCode).to.eq(200);
      });
      cy.get('#resultado-titulo').should('contain', 'Status atualizado');

      cy.request('GET', `${apiUrl}/conta/${cli.id}`).its('body.ativo').should('eq', false);
    });
  });

  it('preserva histórico real de transações entregues e integridade referencial após inativação (RF0025)', () => {
    let clienteHistorico;
    let pedidoReal;

    cy.obterSkuComEstoqueReal({ minEstoque: 3 })
      .then(({ estoque }) =>
        cy.criarClienteTesteReal({ nome: 'Cliente', sobrenome: 'HistoricoIntegro' }).then((cli) => {
          clienteHistorico = cli;
          idsUsuariosParaLimpar.push(cli.id);
          return cy.criarEnderecoReal(cli.id).then((end) =>
            cy.criarCartaoReal(cli.id).then((cartao) =>
              cy.criarPedidoReal({
                usuarioId: cli.id,
                usuarioEnderecoId: end.usuarioEnderecoId,
                usuarioCartaoId: cartao.id,
                estoqueId: estoque.id,
                quantidade: 1,
                statusAlvo: 'Entregue'
              })
            )
          );
        })
      )
      .then((pedido) => {
        pedidoReal = pedido;
        // Soft-delete: inativa a conta do cliente mantendo seus dados e pedidos históricos no PostgreSQL
        return cy.request('PATCH', `${apiUrl}/conta/${clienteHistorico.id}/status`, { ativo: false });
      })
      .then((resStatus) => {
        expect(resStatus.status).to.eq(200);
        expect(resStatus.body.ativo).to.be.false;

        cy.intercept('GET', `${apiUrl}/pedidos*`).as('historicoTransacoes');

        cy.visit(`pedidos.html?id=${clienteHistorico.id}`, {
          onBeforeLoad(win) {
            win.sessionStorage.setItem(
              'usuarioLogado',
              JSON.stringify({ ...clienteHistorico, ativo: false })
            );
          }
        });

        cy.wait('@historicoTransacoes').its('response.statusCode').should('eq', 200);
        cy.get('.order-card').should('be.visible');
        cy.get('.order-number').should('contain', pedidoReal.codigo);
        cy.get('.status').should('contain', 'Entregue');
      });
  });
});
