const USUARIO_CACHE_KEY = 'usuarioLogado';

function obterUsuarioEmCache(id) {
    try {
        const usuario = JSON.parse(sessionStorage.getItem(USUARIO_CACHE_KEY));
        return usuario && Number(usuario.id) === Number(id) ? usuario : null;
    } catch {
        return null;
    }
}

function salvarUsuarioEmCache(usuario) {
    sessionStorage.setItem(USUARIO_CACHE_KEY, JSON.stringify(usuario));
}

function limparUsuarioEmCache() {
    sessionStorage.removeItem(USUARIO_CACHE_KEY);
}

function obterIdUsuarioAtual() {
    const idNaUrl = Number.parseInt(new URLSearchParams(window.location.search).get('id'), 10);
    if (Number.isInteger(idNaUrl) && idNaUrl > 0) return idNaUrl;

    try {
        const usuario = JSON.parse(sessionStorage.getItem(USUARIO_CACHE_KEY));
        const idNoCache = Number.parseInt(usuario?.id, 10);
        return Number.isInteger(idNoCache) && idNoCache > 0 ? idNoCache : null;
    } catch {
        return null;
    }
}

function atualizarLinksConta() {
    const id = obterIdUsuarioAtual();
    if (!id) return;

    document.querySelectorAll('a[href="conta.html"], a[href="./conta.html"]').forEach(link => {
        link.href = `conta.html?id=${encodeURIComponent(id)}`;
    });
}

atualizarLinksConta();
document.addEventListener('DOMContentLoaded', atualizarLinksConta);
