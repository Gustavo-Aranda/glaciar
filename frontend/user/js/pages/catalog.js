// Mostra/Esconde a grade de tamanhos no Card
function toggleSizeSelector(element) {
    // Busca o pai (o wrapper da imagem)
    const wrapper = element.closest('.product-img-wrapper');
    const sizeOverlay = wrapper.querySelector('.size-selector-overlay');
    const quickAddBtn = wrapper.querySelector('.btn-quick-add');

    if (sizeOverlay.classList.contains('hidden')) {
        sizeOverlay.classList.remove('hidden');
        quickAddBtn.style.display = 'none'; // Esconde o botão original
    } else {
        sizeOverlay.classList.add('hidden');
        quickAddBtn.style.display = 'block'; // Mostra o botão original
    }
}

// Simula a adição ao carrinho e abre o Toast
function addToBag(size) {
    const toast = document.getElementById('cart-toast');
    const toastSizeSpan = document.getElementById('toast-size');
    
    // Atualiza o tamanho selecionado no popup
    toastSizeSpan.textContent = size;
    
    // Mostra o Popup (Toast)
    toast.classList.remove('hidden');

    // Oculta todas as grades de tamanho que estiverem abertas
    document.querySelectorAll('.size-selector-overlay').forEach(overlay => {
        overlay.classList.add('hidden');
    });
    document.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.style.display = 'block';
    });
}

// Fecha o Toast
function closeToast() {
    const toast = document.getElementById('cart-toast');
    toast.classList.add('hidden');
}