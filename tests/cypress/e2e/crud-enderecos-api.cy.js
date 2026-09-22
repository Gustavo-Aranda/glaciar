const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

let usuarioId;
let registrosCriados = [];

function obterEnderecoBase() {
  const identificador = Date.now().toString().slice(-8);
  return {
    usuarioId,
    cep: identificador,
    logradouro: 'Rua de Integracao',
    numero: identificador.slice(-4),
    complemento: '',
    bairro: 'Centro',
    cidade: 'Mogi das Cruzes',
    estado: 'SP',
    apelido: `QA ${identificador}`,
    padrao: true
  };
}

describe('CRUD de Endereços (C/A) - API', () => {
  before(() => {
    cy.request('GET', `${apiUrl}/conta`).then(resposta => {
      expect(resposta.status).to.eq(200);
      const usuarioAtivo = resposta.body.find(usuario => usuario.ativo === true);
      expect(usuarioAtivo, 'cliente ativo para os testes de endereço').to.exist;
      usuarioId = usuarioAtivo.id;
    });
  });

  beforeEach(() => {
    registrosCriados = [];
  });

  afterEach(() => {
    registrosCriados.reverse().forEach(usuarioEnderecoId => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/enderecos/${usuarioEnderecoId}`,
        failOnStatusCode: false
      });
    });
    registrosCriados = [];
  });

  it('cadastra, consulta, altera e remove endereço do cliente', () => {
    const dados = obterEnderecoBase();

    cy.request('POST', `${apiUrl}/enderecos`, dados).then(criacao => {
      expect(criacao.status).to.eq(201);
      expect(criacao.body).to.include({
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero
      });

      return cy.request('GET', `${apiUrl}/enderecos/cliente/${usuarioId}`);
    }).then(listaInicial => {
      expect(listaInicial.status).to.eq(200);
      const vinculoCriado = listaInicial.body.find(endereco =>
        endereco.apelido === dados.apelido || endereco.Apelido === dados.apelido
      );
      expect(vinculoCriado, 'vínculo do endereço criado').to.exist;
      const enderecoUsuario = vinculoCriado;
      const usuarioEnderecoId = enderecoUsuario.id || enderecoUsuario.Id;
      const enderecoId = enderecoUsuario.enderecoId || enderecoUsuario.EnderecoId;
      registrosCriados.push(usuarioEnderecoId);

      return cy.request('PUT', `${apiUrl}/enderecos/${usuarioEnderecoId}`, {
        usuarioEnderecoId,
        apelido: 'QA Atualizado',
        padrao: true,
        cep: dados.cep,
        logradouro: 'Avenida de Integracao',
        numero: dados.numero,
        complemento: 'Sala 2',
        bairro: dados.bairro,
        cidade: dados.cidade,
        estado: dados.estado
      }).then(atualizacao => {
        expect(atualizacao.status).to.eq(204);
        return cy.request('GET', `${apiUrl}/enderecos/${enderecoId}`);
      });
    }).then(consulta => {
      expect(consulta.status).to.eq(200);
      expect(consulta.body).to.include({ logradouro: 'Avenida de Integracao', complemento: 'Sala 2' });

      return cy.request({
        method: 'DELETE',
        url: `${apiUrl}/enderecos/${registrosCriados[0]}`
      });
    }).then(remocao => {
      expect(remocao.status).to.eq(204);
    });
  });

  it('rejeita endereço com CEP em branco', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/enderecos`,
      failOnStatusCode: false,
      body: { ...obterEnderecoBase(), cep: '' }
    }).then(resposta => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.erro).to.contain('CEP');
    });
  });

  it('rejeita endereço sem número', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/enderecos`,
      failOnStatusCode: false,
      body: { ...obterEnderecoBase(), numero: '' }
    }).then(resposta => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.erro).to.contain('número');
    });
  });
});
