document.addEventListener("DOMContentLoaded", () => {
    const formCadastro = document.getElementById("form-registrar-cliente");
    const campoCpf = document.getElementById("cpf");

    if (!formCadastro) return;

    campoCpf?.addEventListener("input", aplicarMascaraCPF);

    formCadastro.addEventListener("submit", async (event) => {
        event.preventDefault();

        const dadosCliente = {
            nome: capitalizarNome(obterValor("nome")),
            sobrenome: capitalizarNome(obterValor("sobrenome")),
            cpf: obterValor("cpf").replace(/\D/g, ""),
            email: obterValor("email").toLowerCase(),
            senha: obterValor("senha", false)
        };

        if (!dadosCliente.nome || !dadosCliente.sobrenome || !dadosCliente.email || !dadosCliente.senha) {
            mostrarMensagem("Preencha todos os campos obrigatórios.", "erro");
            return;
        }

        if (!validarCPF(dadosCliente.cpf)) {
            mostrarMensagem("Informe um CPF válido.", "erro");
            return;
        }

        definirEstadoEnvio(true);

        try {
            const resposta = await fetch("http://localhost:5205/api/conta/registrar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosCliente)
            });

            if (!resposta.ok) {
                mostrarMensagem(await obterMensagemErro(resposta), "erro");
                return;
            }

            formCadastro.reset();
            mostrarMensagem("Conta criada com sucesso. Redirecionando...", "sucesso");
            setTimeout(() => { window.location.href = "login.html"; }, 900);
        } catch (error) {
            console.error("Erro na comunicação com a API:", error);
            mostrarMensagem("Não foi possível conectar ao servidor. Tente novamente.", "erro");
        } finally {
            definirEstadoEnvio(false);
        }
    });
});

function obterValor(id, preservarEspacos = false) {
    const campo = document.getElementById(id);
    if (!campo || typeof campo.value !== "string") return "";

    return preservarEspacos ? campo.value : campo.value.trim();
}

function capitalizarNome(nome) {
    return nome.toLocaleLowerCase("pt-BR")
        .replace(/(^|[\s'-])\p{L}/gu, letra => letra.toLocaleUpperCase("pt-BR"));
}

function aplicarMascaraCPF(event) {
    const cpf = event.target.value.replace(/\D/g, "").slice(0, 11);
    event.target.value = cpf
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function validarCPF(cpfInput) {
    const cpf = cpfInput.replace(/\D/g, "");
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

function mostrarMensagem(mensagem, tipo) {
    const elemento = document.getElementById("mensagem-cadastro");
    if (!elemento) return;

    elemento.textContent = mensagem;
    elemento.className = `mensagem-cadastro ${tipo}`;
}

function definirEstadoEnvio(enviando) {
    const botao = document.getElementById("btn-cadastrar");
    const loading = document.getElementById("loading-cadastro");

    if (botao) {
        botao.disabled = enviando;
        botao.textContent = enviando ? "Criando conta..." : "Criar conta";
    }

    loading?.classList.toggle("hidden", !enviando);
}

async function obterMensagemErro(resposta) {
    const dados = await resposta.json().catch(() => null);
    return dados?.erro || dados?.detail || dados?.title ||
        "Não foi possível criar a conta.";
}