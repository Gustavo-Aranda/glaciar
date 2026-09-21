document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById('form-criar-cliente-admin');
    const modal = document.getElementById('modal-criar-cliente');
    const btnOpen = document.getElementById('btn-novo-cliente');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancelar-modal');

    if (modal) {
        const openModal = () => modal.classList.remove('hidden');
        const closeModal = () => modal.classList.add('hidden');

        if (btnOpen) btnOpen.addEventListener('click', openModal);
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();

                const dadosAdmin = {
                    nome: document.getElementById('nome').value,
                    sobrenome: document.getElementById('sobrenome').value,
                    cpf: document.getElementById('cpf').value,
                    email: document.getElementById('email').value,
                    senha: document.getElementById('senha').value,
                    
                    tipoUsuario: parseInt(document.getElementById('tipoUsuario').value) 
                };

                try {

                    const resposta = await fetch("http://localhost:5205/api/conta/admin/registrar", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(dadosAdmin)
                    });

                    if (resposta.status === 201) {
                        alert("Sucesso! Conta criada no sistema.");
                        form.reset();
                        
                        document.getElementById('modal-criar-cliente').classList.add('hidden');
                    } 
                    else if (resposta.status === 400) {
                        const erroDomain = await resposta.json();
                        alert("Atenção: " + erroDomain.erro);
                    } 
                    else {
                        alert("Erro interno no servidor C#.");
                    }

                } catch (error) {
                    console.error("Erro no fetch:", error);
                    alert("Não foi possível conectar à API.");
                }
            });
        }
    }
});