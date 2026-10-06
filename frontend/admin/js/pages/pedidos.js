const API_BASE_URL = 'http://localhost:5205/api';

const statusDisplayMap = {
    'EmProcessamento': 'Em Processamento',
    'PagamentoRealizado': 'Pagamento Realizado',
    'EmTransporte': 'Em Transporte',
    'Entregue': 'Entregue',
    'Cancelado': 'Cancelado'
};

const proximosStatus = {
    'EmProcessamento': ['EmTransporte', 'Cancelado'],
    'EmTransporte': ['Entregue', 'Cancelado']
};

document.addEventListener("DOMContentLoaded", () => {
    carregarPedidos();
});

async function carregarPedidos() {
    const container = document.getElementById('pedidos-container');
    container.innerHTML = '<p>Carregando...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/admin/pedidos`);
        if (!response.ok) throw new Error('Erro ao buscar pedidos');

        const pedidos = await response.json();
        renderizarPedidos(pedidos, container);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:red">Erro ao carregar os pedidos.</p>';
    }
}

function renderizarPedidos(pedidos, container) {
    container.innerHTML = '';

    if (pedidos.length === 0) {
        container.innerHTML = '<p>Não há pedidos para exibir.</p>';
        return;
    }

    pedidos.forEach(pedido => {
        const article = document.createElement('article');
        article.className = 'admin-card';

        // Formata valor total
        const formattedPrice = pedido.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Formata a data (ex: 15/10/2026)
        const dateStr = new Date(pedido.data).toLocaleDateString('pt-BR');

        // Apenas os próximos passos válidos do fluxo
        const permitidos = proximosStatus[pedido.status] || [];
        const optionsHtml = permitidos
            .map(s => `<option value="${s}">${statusDisplayMap[s]}</option>`)
            .join('');
        const updaterHtml = permitidos.length
            ? `<label>Atualizar Status:</label>
               <select class="status-select" id="status-select-${pedido.id}">${optionsHtml}</select>
               <button class="btn btn-primary" onclick="atualizarStatus(${pedido.id})">Aplicar</button>`
            : `<small>Nenhuma ação disponível para este status.</small>`;

        // Cor do badge de status
        let statusClass = '';
        if (pedido.status === 'Cancelado') statusClass = 'status-inativo';
        else if (pedido.status === 'Entregue') statusClass = 'status-ativo';
        else statusClass = 'status-atencao';

        const displayName = statusDisplayMap[pedido.status] || pedido.status;

        article.innerHTML = `
            <div class="card-header">
                <div class="card-info">
                    <span class="card-title">Pedido #${pedido.codigo || pedido.id} <small>(${dateStr})</small></span>
                    <span class="card-subtitle">Cliente: ${pedido.cliente} | ${formattedPrice}</span>
                </div>
                <span class="status ${statusClass}">${displayName}</span>
            </div>
            <div class="card-body">
                <div class="status-updater">
                    ${updaterHtml}
                </div>
            </div>
        `;

        container.appendChild(article);
    });
}

async function atualizarStatus(pedidoId) {
    const select = document.getElementById(`status-select-${pedidoId}`);
    const novoStatus = select.value;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/pedidos/${pedidoId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: novoStatus })
        });

        if (response.ok) {
            carregarPedidos();
        } else {
            const err = await response.json();
            alert(`Erro: ${err.message}`);
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao se comunicar com a API.');
    }
}
