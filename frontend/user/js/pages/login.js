document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            // event.preventDefault() impede que a página recarregue ao clicar no botão
            event.preventDefault();

            // Captura o que o usuário digitou no campo de e-mail
            const emailDigitado = document.getElementById("email").value;

            // Simulação de Autenticação e Autorização (Mock)
            if (emailDigitado === "admin@glaciar.com.br") {
                window.location.href = "../admin/pedidos.html"; 
            } else {
                window.location.href = "conta.html";
            }
        });
    }
});