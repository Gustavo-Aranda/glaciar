document.addEventListener("DOMContentLoaded", () => {
    const formCadastro = document.getElementById("form-registrar-cliente");

    if (formCadastro) {
        formCadastro.addEventListener("submit", async (event) => {
            
            event.preventDefault();

            
            const dadosCliente = {
                nome: document.getElementById("nome").value,
                sobrenome: document.getElementById("sobrenome").value,
                cpf: document.getElementById("cpf").value,
                email: document.getElementById("email").value,
                senha: document.getElementById("senha").value
            };

            try {
                const resposta = await fetch("http://localhost:5205/api/conta/registrar", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(dadosCliente)
                });

                if (resposta.status === 201) {
                    alert("Sucesso! Cliente registrado no banco de dados.");
                    formCadastro.reset();
                    window.location.href = "login.html";
                } 
                else if (resposta.status === 400) {
                    const erroDomain = await resposta.json();
                    alert(erroDomain.erro); 
                } 
                else {
                    alert("Erro interno no servidor (HTTP 500).");
                }

            } catch (error) {
                console.error("Erro fatal na comunicação:", error);
                alert("O frontend não conseguiu alcançar a API. O C# está rodando?");
            }
        });
    }
});