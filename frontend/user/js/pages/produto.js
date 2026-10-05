// frontend/js/pages/produto.js

const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = 1;

async function mockAddToBag() {
    const sizeSelected = document.querySelector(".btn-size.selected");
    let sizeText = "M"; // Padrão
    
    if (sizeSelected) {
        if (!sizeSelected.querySelector('span')) {
            sizeText = sizeSelected.textContent.trim();
        } else {
            sizeText = sizeSelected.querySelector('span').textContent.trim();
        }
    }

    try {
        // Chamada real para a API (Usando EstoqueId = 1 para simulação de demonstração)
        const response = await fetch(`${API_BASE_URL}/carrinho/itens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify({
                estoqueId: 1, 
                quantidade: 1
            })
        });

        if (!response.ok) {
            const erro = await response.json();
            alert('Erro ao adicionar ao carrinho: ' + (erro.message || 'Falha desconhecida.'));
            return;
        }

        // Sucesso
        const toastSizeSpan = document.getElementById('toast-size');
        if (toastSizeSpan) {
            toastSizeSpan.textContent = sizeText;
        }
        
        const toast = document.getElementById('cart-toast');
        if (toast) {
            toast.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Erro de rede:', error);
        alert('Erro ao se conectar ao servidor.');
    }
}

// Fecha o Toast
function closeToast() {
    const toast = document.getElementById('cart-toast');
    if (toast) {
        toast.classList.add('hidden');
    }
}

// Lógica para selecionar o tamanho (interação visual)
document.addEventListener("DOMContentLoaded", () => {
    const sizeButtons = document.querySelectorAll(".btn-size:not(.disabled):not(.waitlist)");

    sizeButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Remove a classe 'selected' de todos
            sizeButtons.forEach(btn => btn.classList.remove("selected"));
            // Adiciona no botão clicado
            button.classList.add("selected");
        });
    });
});