let dadosOriginaisPerfil = null;

document.addEventListener('DOMContentLoaded', async () => {
    const id = obterIdUsuarioAtual();
    const form = document.getElementById('form-editar-perfil');

    if (!id || !form) {
        window.location.href = 'login.html';
        return;
    }

    const cancelar = document.getElementById('btn-cancelar-perfil');
    if (cancelar) cancelar.href = `conta.html?id=${encodeURIComponent(id)}`;
    document.getElementById('telefone')?.addEventListener('input', event => {
        event.target.value = formatarTelefone(event.target.value);
    });

    const modalInativacao = document.getElementById('modal-inativar-conta');
    document.getElementById('btn-inativar-conta')?.addEventListener('click', () => {
        modalInativacao?.classList.remove('hidden');
    });
    document.getElementById('btn-cancelar-inativacao')?.addEventListener('click', fecharModalInativacao);
    document.getElementById('btn-confirmar-inativacao')?.addEventListener('click', () => inativarConta(id));
    modalInativacao?.addEventListener('click', event => {
        if (event.target === modalInativacao) fecharModalInativacao();
    });

    const usuarioEmCache = obterUsuarioEmCache(id);
    if (usuarioEmCache) {
        preencherFormulario(usuarioEmCache);
        dadosOriginaisPerfil = criarSnapshotPerfil(usuarioEmCache);
    } else {
        mostrarLoadingUsuario('Carregando seus dados...');
        try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}`);
        if (!response.ok) throw new Error('Não foi possível carregar o perfil.');

            const usuario = await response.json();
            preencherFormulario(usuario);
            dadosOriginaisPerfil = criarSnapshotPerfil(usuario);
            salvarUsuarioEmCache(usuario);
        } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        mostrarMensagem('Não foi possível carregar seus dados.', 'erro');
            return;
        } finally {
            esconderLoadingUsuario();
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const dados = {
            nome: capitalizarNome(obterValor('nome')),
            sobrenome: capitalizarNome(obterValor('sobrenome')),
            email: obterValor('email').toLowerCase(),
            telefone: obterValor('telefone').replace(/\D/g, ''),
            senha: obterValor('senha', false)
        };

        if (!dados.nome || !dados.sobrenome || !dados.email || !dados.telefone) {
            mostrarMensagem('Preencha todos os campos obrigatórios.', 'erro');
            return;
        }

        if (dados.telefone.length < 10 || dados.telefone.length > 11) {
            mostrarMensagem('Informe um telefone válido com DDD.', 'erro');
            return;
        }

        if (JSON.stringify(dados) === JSON.stringify(dadosOriginaisPerfil)) {
            window.location.href = `conta.html?id=${encodeURIComponent(id)}`;
            return;
        }

        definirEstadoEnvio(true);
        mostrarLoadingUsuario('Salvando alterações...');

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
            salvarUsuarioEmCache(usuarioAtualizado);
            mostrarMensagem('Dados atualizados com sucesso.', 'sucesso');
            setTimeout(() => { window.location.href = `conta.html?id=${encodeURIComponent(id)}`; }, 700);
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
        } finally {
            definirEstadoEnvio(false);
            esconderLoadingUsuario();
        }
    });
});

function preencherFormulario(usuario) {
    document.getElementById('nome').value = usuario.nome || '';
    document.getElementById('sobrenome').value = usuario.sobrenome || '';
    document.getElementById('email').value = usuario.email || '';
    document.getElementById('telefone').value = formatarTelefone(usuario.telefone || '');
}

function criarSnapshotPerfil(usuario) {
    return {
        nome: capitalizarNome(usuario.nome),
        sobrenome: capitalizarNome(usuario.sobrenome),
        email: String(usuario.email || '').trim().toLowerCase(),
        telefone: String(usuario.telefone || '').replace(/\D/g, ''),
        senha: ''
    };
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

function formatarTelefone(telefone) {
    const numeros = String(telefone).replace(/\D/g, '').slice(0, 11);
    return numeros.length > 10
        ? numeros.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
        : numeros.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
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

function fecharModalInativacao() {
    document.getElementById('modal-inativar-conta')?.classList.add('hidden');
}

async function inativarConta(id) {
    fecharModalInativacao();
    mostrarLoadingUsuario('Inativando sua conta...');

    try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: false })
        });

        if (!response.ok) {
            mostrarMensagem(await obterMensagemErro(response), 'erro');
            return;
        }

        limparUsuarioEmCache();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao inativar conta:', error);
        mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
    } finally {
        esconderLoadingUsuario();
    }
}
