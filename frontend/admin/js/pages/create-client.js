document.addEventListener("DOMContentLoaded", () => {
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

        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                alert("Cliente salvo com sucesso!");
                closeModal();
                form.reset();
            });
        }
    }
});