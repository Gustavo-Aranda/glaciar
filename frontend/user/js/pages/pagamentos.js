const CARTOES_API = 'http://localhost:5205/api/cartoes';
let cartaoEmEdicao = null;
let cartaoParaRemover = null;

window.addEventListener('DOMContentLoaded', () => {
    const usuarioId = obterIdUsuarioAtual();
    if (!usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    document.querySelector('.btn-text-add')?.addEventListener('click', () => abrirModalCartao());
    document.getElementById('btn-fechar-modal-cartao')?.addEventListener('click', fecharModalCartao);
    document.getElementById('btn-cancelar-cartao')?.addEventListener('click', fecharModalCartao);
    document.getElementById('modal-cartao')?.addEventListener('click', event => {
        if (event.target.id === 'modal-cartao') fecharModalCartao();
    });
    document.getElementById('form-cartao')?.addEventListener('submit', event => salvarCartao(event, usuarioId));
    document.getElementById('cartao-numero')?.addEventListener('input', aplicarMascaraNumero);
    document.getElementById('cartao-cvv')?.addEventListener('input', aplicarMascaraCvv);
    document.getElementById('btn-cancelar-remocao-cartao')?.addEventListener('click', fecharModalRemocao);
    document.getElementById('btn-confirmar-remocao-cartao')?.addEventListener('click', () => confirmarRemocao(usuarioId));
    document.getElementById('modal-remover-cartao')?.addEventListener('click', event => {
        if (event.target.id === 'modal-remover-cartao') fecharModalRemocao();
    });
    carregarCartoes(usuarioId);
});

async function carregarCartoes(usuarioId) {
    const lista = document.getElementById('lista-cartoes');
    if (!lista) return;

    lista.innerHTML = '<p>Carregando cartões...</p>';

    try {
        const resposta = await fetch(`${CARTOES_API}/cliente/${usuarioId}`);
        if (!resposta.ok) throw new Error(await obterErro(resposta));

        renderizarCartoes(lista, await resposta.json(), usuarioId);
    } catch (error) {
        console.error('Erro ao carregar cartões:', error);
        lista.innerHTML = '<p class="addresses-feedback">Não foi possível carregar seus cartões.</p>';
    }
}

function renderizarCartoes(lista, cartoes, usuarioId) {
    lista.innerHTML = '';

    if (!cartoes.length) {
        lista.innerHTML = '<p class="addresses-feedback">Nenhum cartão cadastrado.</p>';
        return;
    }

    cartoes.forEach(cartao => {
        const item = document.createElement('div');
        item.className = 'wallet-item';
        item.innerHTML = `
            <div class="wallet-info">
                <span class="card-icon">${escaparHtml(formatarBandeira(cartao.bandeira))}</span>
                <div>
                    <strong>Cartão final ${escaparHtml(cartao.ultimosDigitos)}</strong>
                    <p>Expira em ${formatarValidade(cartao.mesValidade, cartao.anoValidade)}</p>
                </div>
            </div>
            <div class="wallet-actions">
                <button type="button" class="btn-text-edit" data-action="editar">Editar</button>
                <button type="button" class="btn-text-remove" data-action="remover">Remover</button>
            </div>
        `;

        item.querySelector('[data-action="editar"]')
            .addEventListener('click', () => abrirModalCartao(cartao));
        item.querySelector('[data-action="remover"]')
            .addEventListener('click', () => removerCartao(usuarioId, cartao));
        lista.appendChild(item);
    });
}

function abrirModalCartao(cartao = null) {
    cartaoEmEdicao = cartao;
    document.getElementById('form-cartao').reset();
    document.getElementById('mensagem-cartao').textContent = '';
    document.getElementById('cartao-modal-kicker').textContent = cartao ? 'Atualização' : 'Cadastro';
    document.getElementById('titulo-modal-cartao').textContent = cartao ? 'Editar cartão' : 'Adicionar cartão';
    document.getElementById('cartao-numero').disabled = Boolean(cartao);
    document.getElementById('cartao-cvv').disabled = Boolean(cartao);
    document.getElementById('cartao-numero').value = cartao ? `**** **** **** ${cartao.ultimosDigitos}` : '';
    document.getElementById('cartao-cvv').value = '';
    document.getElementById('cartao-bandeira').value = cartao?.bandeira || '';
    document.getElementById('cartao-mes').value = cartao?.mesValidade || '';
    document.getElementById('cartao-ano').value = cartao?.anoValidade || '';
    document.getElementById('cartao-padrao').checked = Boolean(cartao?.padrao);
    document.getElementById('modal-cartao').classList.remove('hidden');
    document.getElementById('cartao-bandeira').focus();
}

function fecharModalCartao() {
    document.getElementById('modal-cartao')?.classList.add('hidden');
    cartaoEmEdicao = null;
}

async function salvarCartao(event, usuarioId) {
    event.preventDefault();
    const dados = obterDadosFormulario();
    const botao = document.getElementById('btn-salvar-cartao');

    if (!dados.bandeira || !dados.mesValidade || !dados.anoValidade ||
        (!cartaoEmEdicao && (!dados.numero || !dados.cvv))) {
        mostrarMensagemCartao('Preencha todos os campos obrigatórios.');
        return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando cartão...';

    try {
        const editando = Boolean(cartaoEmEdicao);
        const resposta = await fetch(editando
            ? `${CARTOES_API}/${usuarioId}/${cartaoEmEdicao.id}`
            : CARTOES_API, {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editando ? dados : { usuarioId, ...dados })
        });
        if (!resposta.ok) throw new Error(await obterErro(resposta));

        fecharModalCartao();
        await carregarCartoes(usuarioId);
    } catch (error) {
        mostrarMensagemCartao(error.message);
    } finally {
        botao.disabled = false;
        botao.textContent = 'Salvar cartão';
    }
}

async function removerCartao(usuarioId, cartao) {
    cartaoParaRemover = cartao;
    document.getElementById('cartao-remover-nome').textContent = `Cartão ${formatarBandeira(cartao.bandeira)}`;
    document.getElementById('cartao-remover-detalhes').textContent = `Final ${cartao.ultimosDigitos} | Expira em ${formatarValidade(cartao.mesValidade, cartao.anoValidade)}`;
    document.getElementById('modal-remover-cartao').classList.remove('hidden');
}

function fecharModalRemocao() {
    cartaoParaRemover = null;
    document.getElementById('modal-remover-cartao')?.classList.add('hidden');
}

async function confirmarRemocao(usuarioId) {
    if (!cartaoParaRemover) return;
    const cartao = cartaoParaRemover;
    fecharModalRemocao();

    try {
        const resposta = await fetch(`${CARTOES_API}/${usuarioId}/${cartao.id}`, { method: 'DELETE' });
        if (!resposta.ok) throw new Error(await obterErro(resposta));

        await carregarCartoes(usuarioId);
    } catch (error) {
        document.getElementById('lista-cartoes').insertAdjacentHTML(
            'afterbegin', `<p class="addresses-feedback">${escaparHtml(error.message)}</p>`);
    }
}

function obterDadosFormulario() {
    const dados = {
        bandeira: document.getElementById('cartao-bandeira').value,
        mesValidade: Number.parseInt(document.getElementById('cartao-mes').value, 10),
        anoValidade: Number.parseInt(document.getElementById('cartao-ano').value, 10),
        padrao: document.getElementById('cartao-padrao').checked
    };

    if (!cartaoEmEdicao) {
        dados.numero = document.getElementById('cartao-numero').value.replace(/\D/g, '');
        dados.cvv = document.getElementById('cartao-cvv').value.replace(/\D/g, '');
    }

    return dados;
}

function aplicarMascaraNumero(event) {
    const numero = event.target.value.replace(/\D/g, '').slice(0, 19);
    event.target.value = numero.replace(/(.{4})/g, '$1 ').trim();
}

function aplicarMascaraCvv(event) {
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
}

function formatarValidade(mes, ano) {
    return `${String(mes).padStart(2, '0')}/${ano}`;
}

function formatarBandeira(bandeira) {
    return bandeira === 'AmericanExpress' ? 'American Express' : bandeira;
}

function mostrarMensagemCartao(mensagem) {
    document.getElementById('mensagem-cartao').textContent = mensagem;
}

async function obterErro(resposta) {
    const dados = await resposta.json().catch(() => null);
    return dados?.erro || 'Não foi possível concluir a operação.';
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
