// frontend/user/js/components/chatbot.js
// Assistente virtual "Glaucia" (RNF0044): conversa com a IA e coleta de feedback Útil / Não Útil.

const CHATBOT_API_BASE = "http://localhost:5205/api/chatbot";

document.addEventListener("DOMContentLoaded", () => {
    // O chat usa o histórico de compras do cliente: só existe para quem está logado.
    const usuarioId = resolverUsuarioIdChat();
    if (!usuarioId) return;

    const chatContainer = document.createElement("div");
    chatContainer.id = "chatbot-component-container";
    document.body.appendChild(chatContainer);

    fetch("./components/chatbot.html")
        .then((response) => response.text())
        .then((html) => {
            chatContainer.innerHTML = html;
            inicializarChatbot(usuarioId);
        })
        .catch((error) => console.error("Erro ao carregar o Chatbot:", error));
});

function resolverUsuarioIdChat() {
    if (typeof obterIdUsuarioAtual === "function") {
        return obterIdUsuarioAtual();
    }

    try {
        const usuario = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        const id = Number.parseInt(usuario?.id, 10);
        return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

function formatarMoedaBRL(valor) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor ?? 0));
}

// Escapa o HTML (textContent) e só então aplica **negrito** e quebras de linha.
function formatarTextoSeguro(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

function mensagemDeErroPorStatus(status, erroJson) {
    if (status === 429) return "Você enviou muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.";
    return erroJson?.message || erroJson?.erro || "Não foi possível falar com a Glaucia agora. Tente novamente em instantes.";
}

function inicializarChatbot(usuarioId) {
    const toggleBtn = document.getElementById("chatbot-toggle-btn");
    const closeBtn = document.getElementById("chatbot-close-btn");
    const chatWindow = document.getElementById("chatbot-window");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    const chatBody = document.getElementById("chat-body");

    const headersBase = { "X-Usuario-Id": String(usuarioId) };
    let historicoCarregado = false;
    let enviando = false;

    function abrirChat() {
        chatWindow.classList.remove("hidden");
        if (!historicoCarregado) {
            historicoCarregado = true;
            carregarHistorico();
        }
        setTimeout(() => chatInput.focus(), 100);
    }

    toggleBtn.addEventListener("click", () => {
        if (chatWindow.classList.contains("hidden")) abrirChat();
        else chatWindow.classList.add("hidden");
    });
    closeBtn.addEventListener("click", () => chatWindow.classList.add("hidden"));

    // Botão "Falar com Especialista (IA)" da tela Minha Conta
    document.querySelectorAll(".help-banner .btn-white").forEach((btn) => btn.addEventListener("click", abrirChat));

    document.querySelectorAll(".chip-prompt").forEach((chip) => {
        chip.addEventListener("click", () => {
            const prompt = chip.dataset.prompt;
            if (prompt && !enviando) {
                chatInput.value = prompt;
                enviarMensagem();
            }
        });
    });

    sendBtn.addEventListener("click", enviarMensagem);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") enviarMensagem();
    });

    async function carregarHistorico() {
        try {
            const response = await fetch(`${CHATBOT_API_BASE}/historico`, { headers: headersBase });
            if (!response.ok) return;

            const interacoes = await response.json();
            if (!Array.isArray(interacoes)) return;

            interacoes.slice(-6).forEach((item) => {
                adicionarMensagemUsuario(item.pergunta);
                adicionarMensagemBot(item);
            });
        } catch (error) {
            console.warn("Não foi possível carregar o histórico do chatbot:", error);
        }
    }

    async function enviarMensagem() {
        const texto = chatInput.value.trim();
        if (!texto || enviando) return;

        enviando = true;
        sendBtn.disabled = true;
        chatInput.value = "";

        adicionarMensagemUsuario(texto);
        const indicador = adicionarIndicadorDigitando();

        try {
            const response = await fetch(`${CHATBOT_API_BASE}/mensagem`, {
                method: "POST",
                headers: { ...headersBase, "Content-Type": "application/json" },
                body: JSON.stringify({ mensagem: texto })
            });

            indicador.remove();

            if (!response.ok) {
                const erroJson = await response.json().catch(() => null);
                adicionarMensagemErro(mensagemDeErroPorStatus(response.status, erroJson));
                return;
            }

            adicionarMensagemBot(await response.json());
        } catch (error) {
            indicador.remove();
            console.error("Erro ao consultar a API do chatbot:", error);
            adicionarMensagemErro("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
        } finally {
            enviando = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    }

    async function registrarFeedback(interacaoId, util, feedbackBar, btnUtil, btnNaoUtil) {
        btnUtil.disabled = true;
        btnNaoUtil.disabled = true;

        try {
            const response = await fetch(`${CHATBOT_API_BASE}/feedback`, {
                method: "POST",
                headers: { ...headersBase, "Content-Type": "application/json" },
                body: JSON.stringify({ interacaoId: Number(interacaoId), util })
            });

            if (!response.ok) throw new Error("Falha ao salvar feedback.");

            marcarAvaliacao(btnUtil, btnNaoUtil, util);
            adicionarStatusFeedback(feedbackBar, util
                ? "✓ Obrigada! Vamos priorizar recomendações parecidas."
                : "✓ Obrigada! Vamos evitar esse tipo de recomendação.");
        } catch (error) {
            console.error("Erro ao enviar feedback:", error);
            btnUtil.disabled = false;
            btnNaoUtil.disabled = false;
            if (window.Toast?.showError) window.Toast.showError("Feedback", "Não foi possível registrar sua avaliação.");
        }
    }

    function marcarAvaliacao(btnUtil, btnNaoUtil, util) {
        btnUtil.disabled = true;
        btnNaoUtil.disabled = true;
        btnUtil.classList.toggle("active-util", util === true);
        btnNaoUtil.classList.toggle("active-nao-util", util === false);
    }

    function adicionarStatusFeedback(feedbackBar, texto) {
        let status = feedbackBar.querySelector(".feedback-status");
        if (!status) {
            status = document.createElement("div");
            status.className = "feedback-status";
            feedbackBar.appendChild(status);
        }
        status.textContent = texto;
    }

    function adicionarMensagemUsuario(texto) {
        const msg = document.createElement("div");
        msg.classList.add("message", "user-message");
        msg.textContent = texto;
        chatBody.appendChild(msg);
        rolarParaFinal();
    }

    function adicionarIndicadorDigitando() {
        const msg = document.createElement("div");
        msg.classList.add("message", "bot-message", "typing-indicator");
        msg.textContent = "Glaucia está digitando...";
        chatBody.appendChild(msg);
        rolarParaFinal();
        return msg;
    }

    function adicionarMensagemErro(texto) {
        const msg = document.createElement("div");
        msg.classList.add("message", "bot-message");
        msg.textContent = texto;
        chatBody.appendChild(msg);
        rolarParaFinal();
    }

    function criarLinkProduto(produto) {
        const link = document.createElement("a");
        link.className = "product-chip-link";
        link.href = `produto.html?produto=${encodeURIComponent(produto.produtoId)}`;

        const nome = document.createElement("span");
        nome.textContent = `🏔️ ${produto.nome}`;

        const preco = document.createElement("span");
        preco.className = "product-chip-price";
        preco.textContent = `${formatarMoedaBRL(produto.preco)} →`;

        link.append(nome, preco);
        return link;
    }

    function criarBarraFeedback(interacaoId, util) {
        const barra = document.createElement("div");
        barra.className = "feedback-bar";

        const label = document.createElement("span");
        label.className = "feedback-label";
        label.textContent = "Esta recomendação foi útil?";

        const acoes = document.createElement("div");
        acoes.className = "feedback-actions";

        const btnUtil = document.createElement("button");
        btnUtil.type = "button";
        btnUtil.className = "btn-feedback btn-feedback-util";
        btnUtil.textContent = "👍 Útil";

        const btnNaoUtil = document.createElement("button");
        btnNaoUtil.type = "button";
        btnNaoUtil.className = "btn-feedback btn-feedback-nao-util";
        btnNaoUtil.textContent = "👎 Não Útil";

        if (util === true || util === false) {
            marcarAvaliacao(btnUtil, btnNaoUtil, util);
        } else {
            btnUtil.addEventListener("click", () => registrarFeedback(interacaoId, true, barra, btnUtil, btnNaoUtil));
            btnNaoUtil.addEventListener("click", () => registrarFeedback(interacaoId, false, barra, btnUtil, btnNaoUtil));
        }

        acoes.append(btnUtil, btnNaoUtil);
        barra.append(label, acoes);
        return barra;
    }

    function adicionarMensagemBot({ interacaoId, resposta, produtosRecomendados, util }) {
        const msg = document.createElement("div");
        msg.classList.add("message", "bot-message");

        const texto = document.createElement("div");
        texto.innerHTML = formatarTextoSeguro(resposta);
        msg.appendChild(texto);

        if (Array.isArray(produtosRecomendados) && produtosRecomendados.length > 0) {
            const lista = document.createElement("div");
            lista.className = "recommended-products";
            produtosRecomendados.forEach((produto) => lista.appendChild(criarLinkProduto(produto)));
            msg.appendChild(lista);
        }

        if (interacaoId) {
            msg.appendChild(criarBarraFeedback(interacaoId, util));
        }

        chatBody.appendChild(msg);
        rolarParaFinal();
    }

    function rolarParaFinal() {
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}
