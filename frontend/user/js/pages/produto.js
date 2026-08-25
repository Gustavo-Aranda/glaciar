// frontend/js/pages/produto.js

// Mock da funcionalidade de adicionar ao carrinho
function mockAddToBag() {
    // 1. Encontra qual botão de tamanho está selecionado atualmente
    const sizeSelected = document.querySelector(".btn-size.selected");
    let sizeText = "M"; // Padrão
    
    if (sizeSelected) {
        // Se for um botão de tamanho simples
        if (!sizeSelected.querySelector('span')) {
            sizeText = sizeSelected.textContent.trim();
        } else {
            // Se for um botão de waitlist que foi modificado para permitir clique
            sizeText = sizeSelected.querySelector('span').textContent.trim();
        }
    }

    // 2. Preenche o tamanho no popup
    const toastSizeSpan = document.getElementById('toast-size');
    if (toastSizeSpan) {
        toastSizeSpan.textContent = sizeText;
    }
    
    // 3. Exibe o Popup (Toast)
    const toast = document.getElementById('cart-toast');
    if (toast) {
        toast.classList.remove('hidden');
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