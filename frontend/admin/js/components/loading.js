let carregamentosAtivos = 0;

function mostrarLoading(mensagem = 'Carregando...') {
    const loading = document.getElementById('loading-overlay');
    const texto = document.getElementById('loading-mensagem');
    if (!loading || !texto) return;

    carregamentosAtivos += 1;
    texto.textContent = mensagem;
    loading.classList.remove('hidden');
}

function esconderLoading() {
    const loading = document.getElementById('loading-overlay');
    if (!loading) return;

    carregamentosAtivos = Math.max(0, carregamentosAtivos - 1);
    if (carregamentosAtivos === 0) loading.classList.add('hidden');
}
