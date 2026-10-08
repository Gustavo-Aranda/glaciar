const apiUrl = Cypress.expose('apiUrl') || 'http://localhost:5205/api';

function gerarCpfValido(deslocamento = 0) {
  const base = String(Date.now() + deslocamento).slice(-9).padStart(9, '0').split('').map(Number);
  const calcularDigito = quantidade => {
    const soma = base.slice(0, quantidade).reduce(
      (total, digito, indice) => total + digito * (quantidade + 1 - indice),
      0
    );
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(9);
  base.push(primeiro);
  const segundo = calcularDigito(10);
  return `${base.join('')}${segundo}`;
}

describe('CRUD de Clientes (API)', () => {
  let registrosCriados = [];

  afterEach(() => {
    registrosCriados.reverse().forEach(usuarioId => {
      cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${usuarioId}`,
        failOnStatusCode: false
      });
    });
    registrosCriados = [];
  });

  it('cria, consulta, altera e remove um cliente', () => {
    const cpf = gerarCpfValido();
    const email = `qa.${Date.now()}@example.com`;
    const dados = {
      nome: 'Cliente',
      sobrenome: 'Integracao',
      cpf,
      email,
      telefone: '11987654321',
      senha: 'Senha123!'
    };

    cy.request('POST', `${apiUrl}/conta/registrar`, dados).then(criacao => {
      expect(criacao.status).to.eq(201);
      expect(criacao.body).to.include({ nome: 'Cliente', email });
      expect(criacao.body).not.to.have.any.keys('senha', 'senhaHash');
      registrosCriados.push(criacao.body.id);

      return cy.request('GET', `${apiUrl}/conta/${criacao.body.id}`);
    }).then(consulta => {
      expect(consulta.status).to.eq(200);
      expect(consulta.body).to.include({ cpf, email, ativo: true });

      return cy.request('PUT', `${apiUrl}/conta/${consulta.body.id}/perfil`, {
        nome: 'Cliente Atualizado',
        sobrenome: 'Integracao',
        email,
        telefone: '11987654321',
        senha: ''
      });
    }).then(atualizacao => {
      expect(atualizacao.status).to.eq(200);
      expect(atualizacao.body.nome).to.eq('Cliente Atualizado');

      return cy.request('GET', `${apiUrl}/conta`);
    }).then(lista => {
      expect(lista.status).to.eq(200);
      expect(lista.body.some(usuario => usuario.id === registrosCriados[0])).to.be.true;

      return cy.request({
        method: 'DELETE',
        url: `${apiUrl}/conta/${registrosCriados[0]}`
      });
    }).then(remocao => {
      expect(remocao.status).to.eq(204);
    });
  });

  it('rejeita cliente com CPF inválido', () => {
    cy.request({
      method: 'POST',
      url: `${apiUrl}/conta/registrar`,
      failOnStatusCode: false,
      body: {
        nome: 'Cliente',
        sobrenome: 'Invalido',
        cpf: '11111111111',
        email: `cpf.invalido.${Date.now()}@example.com`,
        telefone: '11987654321',
        senha: 'Senha123!'
      }
    }).then(resposta => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.erro).to.contain('CPF');
    });
  });

  it('rejeita cliente com e-mail já cadastrado', () => {
    const cpf = gerarCpfValido();
    const email = `qa.email.${Date.now()}@example.com`;
    const dados = {
      nome: 'Cliente',
      sobrenome: 'Duplicado',
      cpf,
      email,
      telefone: '11987654321',
      senha: 'Senha123!'
    };

    cy.request('POST', `${apiUrl}/conta/registrar`, dados).then(criacao => {
      expect(criacao.status).to.eq(201);
      registrosCriados.push(criacao.body.id);

      return cy.request({
        method: 'POST',
        url: `${apiUrl}/conta/registrar`,
        failOnStatusCode: false,
        body: { ...dados, cpf: gerarCpfValido(1) }
      });
    }).then(resposta => {
      expect(resposta.status).to.eq(400);
      expect(resposta.body.erro).to.contain('Email');
    });
  });
});
