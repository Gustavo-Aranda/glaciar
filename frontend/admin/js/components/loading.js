// Compatibilidade com código legado do Admin
function mostrarLoading(mensagem = 'Carregando...') {
    if (window.LoadingService) {
        window.LoadingService.show(mensagem);
    }
}

function esconderLoading() {
    if (window.LoadingService) {
        window.LoadingService.hide();
    }
}
