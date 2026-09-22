const ENDERECOS_API = 'http://localhost:5205/api/enderecos';
let enderecos = [];
let enderecoEmEdicao = null;

window.addEventListener('DOMContentLoaded', () => {
    const usuarioId = obterIdUsuarioAtual();
    if (!usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('btn-novo-endereco')?.addEventListener('click', () => abrirModalEndereco());
    document.getElementById('btn-fechar-modal')?.addEventListener('click', fecharModalEndereco);
    document.getElementById('btn-cancelar-endereco')?.addEventListener('click', fecharModalEndereco);
    document.getElementById('modal-endereco')?.addEventListener('click', event => {
        if (event.target.id === 'modal-endereco') fecharModalEndereco();
    });
    document.getElementById('form-endereco')?.addEventListener('submit', salvarEndereco);
    document.getElementById('endereco-cep')?.addEventListener('input', aplicarMascaraCep);

    carregarEnderecos(usuarioId);
});

async function carregarEnderecos(usuarioId) {
    const lista = document.getElementById('lista-enderecos');
    lista.innerHTML = '<p class="addresses-feedback">Carregando endereços...</p>';

    try {
        const resposta = await fetch(`${ENDERECOS_API}/cliente/${usuarioId}`);
        if (!resposta.ok) throw new Error('Não foi possível carregar os endereços.');

        enderecos = await resposta.json();
        renderizarEnderecos();
    } catch (error) {
        console.error('Erro ao carregar endereços:', error);
        lista.innerHTML = '<p class="addresses-feedback">Não foi possível carregar seus endereços.</p>';
    }
}

function renderizarEnderecos() {
    const lista = document.getElementById('lista-enderecos');
    lista.innerHTML = '';

    if (!enderecos.length) {
        lista.innerHTML = `
            <div class="addresses-empty-state">
                <p>Você não tem endereços cadastrados.</p>
                <button type="button" class="addresses-empty-action">Clique aqui para cadastrar</button>
            </div>
        `;
        lista.querySelector('.addresses-empty-action').addEventListener('click', () => abrirModalEndereco());
        return;
    }

    enderecos.forEach(enderecoUsuario => {
        const endereco = enderecoUsuario.endereco || enderecoUsuario.Endereco || {};
        const card = document.createElement('article');
        card.className = 'address-card';
        card.innerHTML = `
            <div class="address-card-header">
                <strong class="address-card-title">${escaparHtml(enderecoUsuario.apelido || enderecoUsuario.Apelido || 'Endereço')}</strong>
                ${enderecoUsuario.padrao || enderecoUsuario.Padrao ? '<span class="address-default-badge">Endereço padrão</span>' : ''}
            </div>
            <div class="address-card-body">
                <p class="address-card-description">${formatarEndereco(endereco)}</p>
                <div class="address-card-actions">
                    <button type="button" class="address-edit-button" data-action="editar">Editar</button>
                    <button type="button" class="address-remove-button" data-action="remover">Remover</button>
                </div>
            </div>
        `;
        card.querySelector('[data-action="editar"]').addEventListener('click', () => abrirModalEndereco(enderecoUsuario));
        card.querySelector('[data-action="remover"]').addEventListener('click', () => removerEndereco(enderecoUsuario.id || enderecoUsuario.Id));
        lista.appendChild(card);
    });
}

function abrirModalEndereco(enderecoUsuario = null) {
    enderecoEmEdicao = enderecoUsuario;
    const modal = document.getElementById('modal-endereco');
    const titulo = document.getElementById('titulo-modal-endereco');
    const formulario = document.getElementById('form-endereco');
    const endereco = enderecoUsuario?.endereco || enderecoUsuario?.Endereco || {};

    formulario.reset();
    document.getElementById('mensagem-endereco').textContent = '';
    titulo.textContent = enderecoUsuario ? 'Editar endereço' : 'Adicionar endereço';
    document.querySelector('.address-modal-kicker').textContent = enderecoUsuario ? 'Atualização' : 'Cadastro';

    preencherCampo('endereco-apelido', enderecoUsuario?.apelido || enderecoUsuario?.Apelido || '');
    preencherCampo('endereco-padrao', enderecoUsuario?.padrao ?? enderecoUsuario?.Padrao ?? false, true);
    preencherCampo('endereco-cep', formatarCep(endereco.cep || endereco.Cep || ''));
    preencherCampo('endereco-logradouro', endereco.logradouro || endereco.Logradouro || '');
    preencherCampo('endereco-numero', endereco.numero || endereco.Numero || '');
    preencherCampo('endereco-complemento', endereco.complemento || endereco.Complemento || '');
    preencherCampo('endereco-bairro', endereco.bairro || endereco.Bairro || '');
    preencherCampo('endereco-cidade', endereco.cidade || endereco.Cidade || '');
    preencherCampo('endereco-estado', endereco.estado || endereco.Estado || '');
    modal.classList.remove('hidden');
    document.getElementById('endereco-apelido').focus();
}

function fecharModalEndereco() {
    document.getElementById('modal-endereco')?.classList.add('hidden');
    enderecoEmEdicao = null;
}

async function salvarEndereco(event) {
    event.preventDefault();
    const usuarioId = obterIdUsuarioAtual();
    const dados = obterDadosFormulario();
    const botao = document.getElementById('btn-salvar-endereco');

    if (!dados.apelido || !dados.cep || !dados.logradouro || !dados.numero || !dados.bairro || !dados.cidade || !dados.estado) {
        mostrarMensagemEndereco('Preencha todos os campos obrigatórios.');
        return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
        const estaEditando = Boolean(enderecoEmEdicao);
        const id = enderecoEmEdicao?.id || enderecoEmEdicao?.Id;
        const url = estaEditando ? `${ENDERECOS_API}/${id}` : ENDERECOS_API;
        const corpo = estaEditando
            ? { usuarioEnderecoId: id, ...dados }
            : { usuarioId, ...dados };
        const resposta = await fetch(url, {
            method: estaEditando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo)
        });

        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => null);
            throw new Error(erro?.erro || 'Não foi possível salvar o endereço.');
        }

        fecharModalEndereco();
        await carregarEnderecos(usuarioId);
    } catch (error) {
        mostrarMensagemEndereco(error.message);
    } finally {
        botao.disabled = false;
        botao.textContent = 'Salvar endereço';
    }
}

async function removerEndereco(id) {
    if (!window.confirm('Deseja remover este endereço?')) return;

    try {
        const resposta = await fetch(`${ENDERECOS_API}/${id}`, { method: 'DELETE' });
        if (!resposta.ok) throw new Error('Não foi possível remover o endereço.');
        await carregarEnderecos(obterIdUsuarioAtual());
    } catch (error) {
        document.getElementById('lista-enderecos').insertAdjacentHTML('afterbegin', `<p class="addresses-feedback">${escaparHtml(error.message)}</p>`);
    }
}

function obterDadosFormulario() {
    return {
        apelido: valorCampo('endereco-apelido'),
        padrao: document.getElementById('endereco-padrao').checked,
        cep: valorCampo('endereco-cep').replace(/\D/g, ''),
        logradouro: valorCampo('endereco-logradouro'),
        numero: valorCampo('endereco-numero'),
        complemento: valorCampo('endereco-complemento'),
        bairro: valorCampo('endereco-bairro'),
        cidade: valorCampo('endereco-cidade'),
        estado: document.getElementById('endereco-estado').value
    };
}

function valorCampo(id) {
    return document.getElementById(id).value.trim();
}

function preencherCampo(id, valor, checkbox = false) {
    const campo = document.getElementById(id);
    if (checkbox) campo.checked = Boolean(valor);
    else campo.value = valor;
}

function aplicarMascaraCep(event) {
    event.target.value = formatarCep(event.target.value);
}

function formatarCep(cep) {
    const numeros = String(cep).replace(/\D/g, '').slice(0, 8);
    return numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
}

function formatarEndereco(endereco) {
    const rua = `${endereco.logradouro || endereco.Logradouro || ''}, ${endereco.numero || endereco.Numero || ''}`;
    const complemento = endereco.complemento || endereco.Complemento;
    const localidade = `${endereco.bairro || endereco.Bairro || ''} - ${endereco.cidade || endereco.Cidade || ''}/${endereco.estado || endereco.Estado || ''}`;
    return escaparHtml(`${rua}${complemento ? `, ${complemento}` : ''} | ${localidade} | CEP ${formatarCep(endereco.cep || endereco.Cep || '')}`);
}

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>'"]/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[caractere]));
}

function mostrarMensagemEndereco(mensagem) {
    document.getElementById('mensagem-endereco').textContent = mensagem;
}
