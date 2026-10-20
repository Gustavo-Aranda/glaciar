const API_BASE_URL = 'http://localhost:5205/api';

const statusDisplayMap = {
    'EmAberto': 'Em Aberto',
    'EmProcessamento': 'Em Processamento',
    'PagamentoRealizado': 'Pagamento Realizado',
    'PagamentoReprovado': 'Pagamento Reprovado',
    'EmTransporte': 'Em Trânsito',
    'Entregue': 'Entregue',
    'Cancelado': 'Cancelado',
    'TrocaSolicitada': 'Troca Solicitada',
    'TrocaAceita': 'Troca Aceita',
    'TrocaNegada': 'Troca Negada',
    'ItemEnviado': 'Item Enviado',
    'ItemRecebido': 'Item Recebido',
    'Trocado': 'Trocado'
};

document.addEventListener("DOMContentLoaded", () => {
    carregarPedidos();
});

async function carregarPedidos() {
    const container = document.getElementById('pedidos-container');
    if (!container) return;
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

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
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

        // Dupla Blindagem: o backend calcula e envia a lista exata de próximos status permitidos
        const permitidos = Array.isArray(pedido.proximosStatus) ? pedido.proximosStatus : [];
        const optionsHtml = permitidos
            .map(s => `<option value="${s}">${statusDisplayMap[s] || s}</option>`)
            .join('');
        const updaterHtml = permitidos.length
            ? `<label>Atualizar Status:</label>
               <select class="status-select" id="status-select-${pedido.id}">${optionsHtml}</select>
               <button class="btn btn-primary" onclick="atualizarStatus(${pedido.id})">Aplicar</button>`
            : `<small>Nenhuma ação operacional disponível para este status.</small>`;

        // Cor do badge de status
        let statusClass = 'status-atencao';
        if (['Cancelado', 'PagamentoReprovado', 'TrocaNegada'].includes(pedido.status)) {
            statusClass = 'status-inativo';
        } else if (['Entregue', 'Trocado'].includes(pedido.status)) {
            statusClass = 'status-ativo';
        }

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
    if (!select) return;
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
            const data = await response.json();
            if (data.dados?.cupomTrocaGerado) {
                const cupom = data.dados.cupomTrocaGerado;
                const msg = `Troca concluída com sucesso! Cupom de Troca gerado: ${cupom.codigo} no valor de R$ ${cupom.valorDesconto.toFixed(2)}.`;
                if (typeof mostrarNotificacao === 'function') {
                    mostrarNotificacao(msg, 'sucesso');
                } else {
                    alert(msg);
                }
            } else if (typeof mostrarNotificacao === 'function') {
                mostrarNotificacao(data.message || 'Status atualizado com sucesso!', 'sucesso');
            }
            carregarPedidos();
        } else {
            const err = await response.json().catch(() => ({ message: 'Falha ao atualizar status.' }));
            if (typeof mostrarNotificacao === 'function') {
                mostrarNotificacao(err.message, 'erro');
            } else {
                alert(`Erro: ${err.message}`);
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof mostrarNotificacao === 'function') {
            mostrarNotificacao('Erro de conexão ao se comunicar com a API.', 'erro');
        } else {
            alert('Erro ao se comunicar com a API.');
        }
    }
}
