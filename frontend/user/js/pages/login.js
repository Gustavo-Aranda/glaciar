document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim().toLowerCase();
        const senha = document.getElementById("password").value;

        if (!email || !senha) {
            mostrarMensagemLogin("Informe seu e-mail e sua senha.");
            return;
        }

        definirEstadoLogin(true);

        try {
            const resposta = await fetch("http://localhost:5205/api/conta/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, senha })
            });

            if (!resposta.ok) {
                mostrarMensagemLogin(await obterMensagemErroLogin(resposta));
                return;
            }

            const usuario = await resposta.json();
            sessionStorage.setItem("usuarioLogado", JSON.stringify(usuario));

            const tipoUsuario = usuario.tipoUsuario;
            window.location.href = tipoUsuario === 1 || tipoUsuario === "ADM"
                ? "../admin/pedidos.html"
                : `conta.html?id=${encodeURIComponent(usuario.id)}`;
        } catch (error) {
            console.error("Erro na comunicação com a API:", error);
            mostrarMensagemLogin("Não foi possível conectar ao servidor. Tente novamente.");
        } finally {
            definirEstadoLogin(false);
        }
    });
});

function mostrarMensagemLogin(mensagem) {
    const elemento = document.getElementById("mensagem-login");
    if (!elemento) return;

    elemento.textContent = mensagem;
    elemento.classList.add("visivel");
}

function definirEstadoLogin(enviando) {
    const botao = document.getElementById("btn-login");
    if (!botao) return;

    botao.disabled = enviando;
    botao.textContent = enviando ? "Entrando..." : "Entrar";
}

async function obterMensagemErroLogin(resposta) {
    const dados = await resposta.json().catch(() => null);
    return dados?.erro || dados?.detail || dados?.title ||
        "E-mail ou senha inválidos.";
}