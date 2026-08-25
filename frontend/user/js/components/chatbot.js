// frontend/js/components/chatbot.js

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Cria uma div invisível no final da página para receber o Chat
    const chatContainer = document.createElement("div");
    chatContainer.id = "chatbot-component-container";
    document.body.appendChild(chatContainer);

    // 2. Faz o Fetch do HTML isolado do Chatbot e injeta na tela
    fetch("./components/chatbot.html")
        .then(response => response.text())
        .then(html => {
            chatContainer.innerHTML = html;
            inicializarChatbot(); // Chama a lógica do chat só depois de injetado
        })
        .catch(error => console.error("Erro ao carregar o Chatbot:", error));

    // 3. Lógica de Interação da Interface
    function inicializarChatbot() {
        const toggleBtn = document.getElementById("chatbot-toggle-btn");
        const closeBtn = document.getElementById("chatbot-close-btn");
        const chatWindow = document.getElementById("chatbot-window");
        
        const chatInput = document.getElementById("chat-input");
        const sendBtn = document.getElementById("chat-send-btn");
        const chatBody = document.getElementById("chat-body");

        // Abrir e Fechar Janela
        const toggleChat = () => chatWindow.classList.toggle("hidden");
        toggleBtn.addEventListener("click", toggleChat);
        closeBtn.addEventListener("click", toggleChat);

        // Enviar mensagem ao clicar no botão ou apertar Enter
        const enviarMensagem = () => {
            const texto = chatInput.value.trim();
            if (!texto) return;

            // Insere a mensagem do Usuário
            adicionarMensagem(texto, "user-message");
            chatInput.value = "";

            // Mock: Simula o "Digitando..." e a resposta da IA (Gemini)
            setTimeout(() => {
                adicionarMensagem("Que desafio incrível! Analisando nosso catálogo, recomendo a Jaqueta Alpine Pro SV. Ela possui membrana corta-vento ideal para esse cenário.", "bot-message");
            }, 1000);
        };

        sendBtn.addEventListener("click", enviarMensagem);
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") enviarMensagem();
        });

        // Função auxiliar para criar os balões de texto na tela
        function adicionarMensagem(texto, classeTipo) {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("message", classeTipo);
            msgDiv.textContent = texto;
            chatBody.appendChild(msgDiv);
            chatBody.scrollTop = chatBody.scrollHeight; // Rola pro final automaticamente
        }
    }
});