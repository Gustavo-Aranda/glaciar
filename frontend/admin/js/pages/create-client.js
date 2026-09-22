document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('form-criar-cliente');
    const modal = document.getElementById('modal-criar-cliente');
    const btnOpen = document.getElementById('btn-novo-cliente');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancelar-modal');
    const campoCpf = document.getElementById('cpf');
    const campoTelefone = document.getElementById('telefone');

    if (modal) {
        const openModal = () => modal.classList.remove('hidden');
        const closeModal = () => modal.classList.add('hidden');

        if (btnOpen) btnOpen.addEventListener('click', openModal);
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        if (campoCpf) campoCpf.addEventListener('input', atualizarMascaraCpf);
        if (campoTelefone) campoTelefone.addEventListener('input', atualizarMascaraTelefone);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        if (form) {
            form.reset();
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const nome = capitalizarNome(obterValorCampo('nome'));
                const sobrenome = capitalizarNome(obterValorCampo('sobrenome'));
                const cpf = obterValorCampo('cpf').replace(/\D/g, '');
                const email = obterValorCampo('email');
                const telefone = obterValorCampo('telefone').replace(/\D/g, '');
                const senha = obterValorCampo('senha', false);
                const tipoUsuario = Number.parseInt(obterValorCampo('tipoUsuario', false), 10);

                if (!nome || !sobrenome || !email || !telefone || !senha) {
                    mostrarNotificacao('Preencha todos os campos obrigatórios.');
                    return;
                }

                if (telefone.length < 10 || telefone.length > 11) {
                    mostrarNotificacao('Informe um telefone válido com DDD.');
                    return;
                }

                if (!validarCPF(cpf)) {
                    mostrarNotificacao('Informe um CPF válido com 11 dígitos.');
                    return;
                }

                if (![0, 1].includes(tipoUsuario)) {
                    mostrarNotificacao('Selecione um tipo de conta válido.');
                    return;
                }

                const dadosAdmin = {
                    nome,
                    sobrenome,
                    cpf,
                    email,
                    telefone,
                    senha,
                    tipoUsuario
                };

                mostrarLoading('Criando cliente...');
                try {

                    const resposta = await fetch("http://localhost:5205/api/conta/admin/registrar", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(dadosAdmin)
                    });

                    if (resposta.ok) {
                        form.reset();
                        closeModal();
                        mostrarResultado('Conta criada', 'O cliente foi cadastrado com sucesso.', 'sucesso');
                        if (typeof carregarClientes === 'function') carregarClientes();
                        return;
                    }

                    const erro = await obterMensagemErro(resposta);
                    mostrarNotificacao(erro);

                } catch (error) {
                    console.error("Erro no fetch:", error);
                    mostrarResultado('Não foi possível concluir', 'Não foi possível conectar à API.', 'erro');
                } finally {
                    esconderLoading();
                }
            });
        }
    }
});

async function obterMensagemErro(resposta) {
    const dados = await resposta.json().catch(() => null);

    return dados?.erro || dados?.detail || dados?.title ||
        'Não foi possível criar a conta.';
}

function obterValorCampo(id, removerEspacos = true) {
    const campo = document.getElementById(id);
    if (!campo || typeof campo.value !== 'string') return '';

    return removerEspacos ? campo.value.trim() : campo.value;
}

function capitalizarNome(nome) {
    return nome.toLocaleLowerCase('pt-BR').replace(/(^|[\s'-])\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR'));
}

function atualizarMascaraCpf(event) {
    const cpf = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = cpf
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function validarCPF(cpfInput) {
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

function atualizarMascaraTelefone(event) {
    const telefone = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = telefone.length > 10
        ? telefone.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
        : telefone.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
}