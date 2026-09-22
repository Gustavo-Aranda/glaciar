document.addEventListener('DOMContentLoaded', async () => {
    const id = obterIdUsuario();
    if (!id) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('btn-sair-conta')?.addEventListener('click', () => {
        sessionStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    });

    const linkEditar = document.getElementById('btn-editar-perfil');
    if (linkEditar) linkEditar.href = `editar-perfil.html?id=${encodeURIComponent(id)}`;

    try {
        const response = await fetch(`http://localhost:5205/api/conta/${id}`);
        if (!response.ok) throw new Error('Não foi possível carregar o perfil.');

        const usuario = await response.json();
        preencherPerfil(usuario);
        sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        document.getElementById('conta-nome').textContent = 'Não disponível';
        document.getElementById('conta-sobrenome').textContent = 'Não disponível';
        document.getElementById('conta-email').textContent = 'Não disponível';
    }
});

function obterIdUsuario() {
    const id = Number.parseInt(new URLSearchParams(window.location.search).get('id'), 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function preencherPerfil(usuario) {
    document.getElementById('conta-nome').textContent = usuario.nome || '';
    document.getElementById('conta-sobrenome').textContent = usuario.sobrenome || '';
    document.getElementById('conta-email').textContent = usuario.email || '';
}
