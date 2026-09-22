function mostrarNotificacao(mensagem, tipo = 'erro') {
    const container = document.getElementById('notificacoes-container');
    if (!container) return;

    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.setAttribute('role', 'alert');
    notificacao.textContent = mensagem;
    container.appendChild(notificacao);

    setTimeout(() => notificacao.remove(), 4500);
}

function mostrarResultado(titulo, mensagem, tipo = 'sucesso') {
    const modal = document.getElementById('modal-resultado');
    if (!modal) return;

    const icone = modal.querySelector('.resultado-icone');
    icone.textContent = tipo === 'sucesso' ? '\u2713' : '\u00d7';
    icone.className = `resultado-icone resultado-icone-${tipo}`;
    modal.querySelector('.resultado-titulo').textContent = titulo;
    modal.querySelector('.resultado-mensagem').textContent = mensagem;
    modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-resultado');
    const fechar = document.getElementById('btn-fechar-resultado');

    fechar?.addEventListener('click', () => modal.classList.add('hidden'));
    modal?.addEventListener('click', event => {
        if (event.target === modal) modal.classList.add('hidden');
    });
});
