document.addEventListener('DOMContentLoaded', async () => {
    const id = obterIdUsuario();
    const form = document.getElementById('form-editar-perfil');

    if (!id || !form) {
        window.location.href = 'login.html';
        return;
    }

    const cancelar = document.getElementById('btn-cancelar-perfil');
    if (cancelar) cancelar.href = `conta.html?id=${encodeURIComponent(id)}`;

    try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}`);
        if (!response.ok) throw new Error('Não foi possível carregar o perfil.');

        preencherFormulario(await response.json());
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        mostrarMensagem('Não foi possível carregar seus dados.', 'erro');
        return;
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const dados = {
            nome: capitalizarNome(obterValor('nome')),
            sobrenome: capitalizarNome(obterValor('sobrenome')),
            email: obterValor('email').toLowerCase(),
            senha: obterValor('senha', false)
        };

        if (!dados.nome || !dados.sobrenome || !dados.email) {
            mostrarMensagem('Preencha todos os campos obrigatórios.', 'erro');
            return;
        }

        definirEstadoEnvio(true);

        try {
            const response = await fetch(`http://localhost:5205/api/conta/${id}/perfil`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                mostrarMensagem(await obterMensagemErro(response), 'erro');
                return;
            }

            const usuarioAtualizado = await response.json();
            sessionStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtualizado));
            mostrarMensagem('Dados atualizados com sucesso.', 'sucesso');
            setTimeout(() => { window.location.href = `conta.html?id=${encodeURIComponent(id)}`; }, 700);
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
        } finally {
            definirEstadoEnvio(false);
        }
    });
});

function obterIdUsuario() {
    const id = Number.parseInt(new URLSearchParams(window.location.search).get('id'), 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function preencherFormulario(usuario) {
    document.getElementById('nome').value = usuario.nome || '';
    document.getElementById('sobrenome').value = usuario.sobrenome || '';
    document.getElementById('email').value = usuario.email || '';
}

function obterValor(id, preservarEspacos = false) {
    const campo = document.getElementById(id);
    if (!campo || typeof campo.value !== 'string') return '';

    return preservarEspacos ? campo.value : campo.value.trim();
}

function capitalizarNome(nome) {
    return nome.toLocaleLowerCase('pt-BR')
        .replace(/(^|[\s'-])\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR'));
}

function mostrarMensagem(mensagem, tipo) {
    const elemento = document.getElementById('mensagem-editar-perfil');
    if (!elemento) return;

    elemento.textContent = mensagem;
    elemento.className = `mensagem-editar-perfil ${tipo}`;
}

function definirEstadoEnvio(enviando) {
    const botao = document.getElementById('btn-salvar-perfil');
    if (!botao) return;

    botao.disabled = enviando;
    botao.textContent = enviando ? 'Salvando...' : 'Salvar Alterações';
}

async function obterMensagemErro(response) {
    const dados = await response.json().catch(() => null);
    return dados?.erro || dados?.detail || dados?.title || 'Não foi possível atualizar o perfil.';
}
