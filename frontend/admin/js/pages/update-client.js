let clienteEmEdicaoId = null;
let dadosOriginaisCliente = null;

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-editar-cliente');
    const form = document.getElementById('form-editar-cliente');
    const btnClose = document.getElementById('btn-close-edit-modal');
    const btnCancel = document.getElementById('btn-cancelar-edit-modal');
    const campoCpf = document.getElementById('editar-cpf');
    const campoTelefone = document.getElementById('editar-telefone');

    if (!modal || !form) return;

    const fecharModal = () => {
        modal.classList.add('hidden');
        clienteEmEdicaoId = null;
        dadosOriginaisCliente = null;
        form.reset();
    };

    btnClose?.addEventListener('click', fecharModal);
    btnCancel?.addEventListener('click', fecharModal);
    campoCpf?.addEventListener('input', atualizarMascaraCpfEdicao);
    campoTelefone?.addEventListener('input', atualizarMascaraTelefoneEdicao);

    modal.addEventListener('click', event => {
        if (event.target === modal) fecharModal();
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();

        if (!clienteEmEdicaoId) return;

        const dados = {
            nome: capitalizarNomeEdicao(obterValorEdicao('editar-nome')),
            sobrenome: capitalizarNomeEdicao(obterValorEdicao('editar-sobrenome')),
            cpf: obterValorEdicao('editar-cpf').replace(/\D/g, ''),
            email: obterValorEdicao('editar-email').toLowerCase(),
            telefone: obterValorEdicao('editar-telefone').replace(/\D/g, ''),
            tipoUsuario: Number.parseInt(obterValorEdicao('editar-tipoUsuario', false), 10)
        };

        if (!dados.nome || !dados.sobrenome || !dados.email || !dados.telefone || !validarCPFEdicao(dados.cpf)) {
            mostrarNotificacao('Preencha os campos corretamente e informe um CPF válido.');
            return;
        }

        if (dados.telefone.length < 10 || dados.telefone.length > 11) {
            mostrarNotificacao('Informe um telefone válido com DDD.');
            return;
        }

        if (![0, 1].includes(dados.tipoUsuario)) {
            mostrarNotificacao('Selecione um tipo de conta válido.');
            return;
        }

        if (JSON.stringify(dados) === JSON.stringify(dadosOriginaisCliente)) {
            fecharModal();
            return;
        }

        mostrarLoading('Atualizando cliente...');
        try {
            const response = await fetch(`http://localhost:5205/api/conta/${clienteEmEdicaoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const erro = await obterMensagemErroEdicao(response);
                mostrarNotificacao(erro);
                return;
            }

            fecharModal();
            await carregarClientes();
            mostrarResultado('Cliente atualizado', 'Os dados foram atualizados com sucesso.', 'sucesso');
        } catch (error) {
            console.error('Erro ao atualizar cliente:', error);
            mostrarResultado('Não foi possível concluir', 'Não foi possível conectar à API.', 'erro');
        } finally {
            esconderLoading();
        }
    });
});

function abrirEdicaoCliente(id) {
    const cliente = clientesGerais.find(clienteAtual => clienteAtual.id === id);
    if (!cliente) return;

    clienteEmEdicaoId = id;
    document.getElementById('editar-nome').value = capitalizarNomeEdicao(cliente.nome);
    document.getElementById('editar-sobrenome').value = capitalizarNomeEdicao(cliente.sobrenome);
    document.getElementById('editar-cpf').value = formatarCPFEdicao(cliente.cpf);
    document.getElementById('editar-email').value = cliente.email || '';
    document.getElementById('editar-telefone').value = formatarTelefoneEdicao(cliente.telefone || '');
    document.getElementById('editar-tipoUsuario').value = String(cliente.tipoUsuario);
    dadosOriginaisCliente = {
        nome: capitalizarNomeEdicao(cliente.nome),
        sobrenome: capitalizarNomeEdicao(cliente.sobrenome),
        cpf: String(cliente.cpf || '').replace(/\D/g, ''),
        email: String(cliente.email || '').trim().toLowerCase(),
        telefone: String(cliente.telefone || '').replace(/\D/g, ''),
        senha: '',
        tipoUsuario: Number(cliente.tipoUsuario)
    };
    document.getElementById('modal-editar-cliente').classList.remove('hidden');
}

function obterValorEdicao(id, removerEspacos = true) {
    const campo = document.getElementById(id);
    if (!campo || typeof campo.value !== 'string') return '';

    return removerEspacos ? campo.value.trim() : campo.value;
}

function atualizarMascaraCpfEdicao(event) {
    const cpf = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = cpf
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function atualizarMascaraTelefoneEdicao(event) {
    event.target.value = formatarTelefoneEdicao(event.target.value);
}

function formatarTelefoneEdicao(telefone) {
    const numeros = String(telefone).replace(/\D/g, '').slice(0, 11);
    return numeros.length > 10
        ? numeros.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
        : numeros.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
}

function formatarCPFEdicao(cpf) {
    const numeros = String(cpf || '').replace(/\D/g, '');
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function validarCPFEdicao(cpfInput) {
    const cpf = cpfInput.replace(/\D/g, '');
    if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;

    const calcularDigito = quantidade => {
        let soma = 0;
        for (let indice = 0; indice < quantidade; indice++) {
            soma += Number(cpf[indice]) * (quantidade + 1 - indice);
        }

        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    return Number(cpf[9]) === calcularDigito(9) &&
        Number(cpf[10]) === calcularDigito(10);
}

function capitalizarNomeEdicao(nome) {
    return String(nome || '')
        .toLocaleLowerCase('pt-BR')
        .replace(/(^|[\s'-])\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR'));
}

async function obterMensagemErroEdicao(response) {
    const dados = await response.json().catch(() => null);
    return dados?.erro || dados?.detail || dados?.title || 'Não foi possível atualizar o cliente.';
}
