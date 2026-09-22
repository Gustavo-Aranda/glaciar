function mostrarLoadingUsuario(mensagem = 'Carregando...') {
    const loading = document.getElementById('loading-usuario');
    const texto = document.getElementById('loading-usuario-mensagem');
    if (!loading || !texto) return;

    texto.textContent = mensagem;
    loading.classList.remove('hidden');
}

function esconderLoadingUsuario() {
    document.getElementById('loading-usuario')?.classList.add('hidden');
}
