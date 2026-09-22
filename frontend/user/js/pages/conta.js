document.addEventListener('DOMContentLoaded', async () => {
    const id = obterIdUsuarioAtual();
    if (!id) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('btn-sair-conta')?.addEventListener('click', () => {
        limparUsuarioEmCache();
        window.location.href = 'login.html';
    });

    const linkEditar = document.getElementById('btn-editar-perfil');
    if (linkEditar) linkEditar.href = `editar-perfil.html?id=${encodeURIComponent(id)}`;

    const usuarioEmCache = obterUsuarioEmCache(id);
    if (usuarioEmCache) {
        preencherPerfil(usuarioEmCache);
        return;
    }

    mostrarLoadingUsuario('Carregando seus dados...');
    try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}`);
        if (!response.ok) throw new Error('Não foi possível carregar o perfil.');

        const usuario = await response.json();
        preencherPerfil(usuario);
        salvarUsuarioEmCache(usuario);
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        document.getElementById('conta-nome').textContent = 'Não disponível';
        document.getElementById('conta-sobrenome').textContent = 'Não disponível';
        document.getElementById('conta-email').textContent = 'Não disponível';
    } finally {
        esconderLoadingUsuario();
    }
});

function preencherPerfil(usuario) {
    document.getElementById('conta-nome').textContent = usuario.nome || '';
    document.getElementById('conta-sobrenome').textContent = usuario.sobrenome || '';
    document.getElementById('conta-email').textContent = usuario.email || '';
}
