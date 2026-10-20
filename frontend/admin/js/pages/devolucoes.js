/**
 * devolucoes.js - Gestão Operacional de Trocas e Devoluções no Painel Admin
 */

const API_BASE_URL = 'http://localhost:5205/api';

const statusDisplayMap = {
    'TrocaSolicitada': 'Troca Solicitada',
    'TrocaAceita': 'Troca Autorizada',
    'TrocaNegada': 'Troca Recusada',
    'ItemEnviado': 'Item Despachado (Em Trânsito)',
    'ItemRecebido': 'Item Recebido (Em Conferência)',
    'Trocado': 'Troca Concluída'
};

const statusActionLabelMap = {
    'TrocaAceita': 'Autorizar Troca',
    'TrocaNegada': 'Recusar Troca',
    'ItemRecebido': 'Confirmar Recebimento Físico',
    'Trocado': 'Confirmar Conferência e Gerar Cupom'
};

const STATUS_DEVOLUCOES = new Set([
    'TrocaSolicitada',
    'TrocaAceita',
    'TrocaNegada',
    'ItemEnviado',
    'ItemRecebido',
    'Trocado'
]);

let todasDevolucoes = [];

document.addEventListener("DOMContentLoaded", () => {
    configurarBusca();
    carregarDevolucoes();
});

function configurarBusca() {
    const inputBusca = document.getElementById('search-devolucoes');
    const btnBusca = document.getElementById('btn-buscar-devolucoes');

    if (inputBusca) {
        inputBusca.addEventListener('input', () => filtrarDevolucoes(inputBusca.value));
    }
    if (btnBusca && inputBusca) {
        btnBusca.addEventListener('click', () => filtrarDevolucoes(inputBusca.value));
    }
}

function escaparHtml(texto = '') {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function filtrarDevolucoes(termo) {
    const container = document.getElementById('devolucoes-container');
    if (!container) return;

    if (!termo || !termo.trim()) {
        renderizarDevolucoes(todasDevolucoes, container);
        return;
    }

    const t = termo.trim().toLowerCase();
    const filtradas = todasDevolucoes.filter(d => {
        const codigo = (d.codigo || d.id || '').toString().toLowerCase();
        const cliente = (d.cliente || '').toLowerCase();
        const status = (statusDisplayMap[d.status] || d.status || '').toLowerCase();
        const motivo = (d.motivoTroca || '').toLowerCase();
        return codigo.includes(t) || cliente.includes(t) || status.includes(t) || motivo.includes(t);
    });

    renderizarDevolucoes(filtradas, container);
}

async function carregarDevolucoes() {
    const container = document.getElementById('devolucoes-container');
    if (!container) return;
    container.innerHTML = '<p>Carregando solicitações de troca...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/admin/pedidos?tipo=troca`);
        if (!response.ok) throw new Error('Erro ao buscar devoluções');

        const pedidos = await response.json();
        // Dupla blindagem: assegura que apenas pedidos em fluxo de troca apareçam nesta tela
        todasDevolucoes = (Array.isArray(pedidos) ? pedidos : []).filter(p => STATUS_DEVOLUCOES.has(p.status));
        renderizarDevolucoes(todasDevolucoes, container);
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:red">Erro ao carregar devoluções do servidor.</p>';
    }
}

function renderizarDevolucoes(devolucoes, container) {
    container.innerHTML = '';

    if (!Array.isArray(devolucoes) || devolucoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1.5rem; background: var(--branco); border: 1px dashed var(--borda-cinza); border-radius: 8px;">
                <p style="color: var(--cinza-rocha-claro); font-size: 1rem; margin: 0;">Nenhuma solicitação de troca ou devolução ativa no momento.</p>
            </div>
        `;
        return;
    }

    devolucoes.forEach(pedido => {
        const article = document.createElement('article');
        article.className = 'admin-card';

        const formattedPrice = pedido.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dateStr = new Date(pedido.data).toLocaleDateString('pt-BR');

        // Dupla Blindagem: o backend calcula e envia a lista exata de próximos status permitidos
        const permitidos = Array.isArray(pedido.proximosStatus) ? pedido.proximosStatus : [];
        const optionsHtml = permitidos
            .map(s => `<option value="${s}">${statusActionLabelMap[s] || statusDisplayMap[s] || s}</option>`)
            .join('');

        const updaterHtml = permitidos.length
            ? `<label>Avançar Status da Troca:</label>
               <select class="status-select" id="status-select-${pedido.id}">${optionsHtml}</select>
               <button class="btn btn-primary" onclick="atualizarStatusTroca(${pedido.id})">Aplicar</button>`
            : `<small style="color: var(--cinza-rocha-claro); font-weight: 500;">Ciclo de troca finalizado para este pedido.</small>`;

        // Cor do badge de status
        let statusClass = 'status-atencao';
        if (pedido.status === 'TrocaNegada') {
            statusClass = 'status-inativo';
        } else if (pedido.status === 'Trocado') {
            statusClass = 'status-ativo';
        }

        const displayName = statusDisplayMap[pedido.status] || pedido.status;

        const motivoHtml = pedido.motivoTroca
            ? `<div class="motivo-troca-box" style="margin: 0.85rem 0; padding: 0.85rem 1rem; background: var(--fundo-app, #F5F7FA); border-left: 4px solid var(--azul-gelo, #2B4C7E); border-radius: 4px;">
                   <strong style="font-size: 0.85rem; color: var(--cinza-rocha, #333); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem;">
                       <span>📝</span> Motivo da Troca informado pelo Cliente:
                   </strong>
                   <p style="margin: 0; font-size: 0.95rem; color: var(--cinza-rocha, #333); line-height: 1.4; font-style: italic;">
                       "${escaparHtml(pedido.motivoTroca)}"
                   </p>
               </div>`
            : `<div style="margin: 0.5rem 0; font-size: 0.85rem; color: var(--cinza-rocha-claro); font-style: italic;">Motivo da troca não especificado.</div>`;

        const itensHtml = Array.isArray(pedido.itensTroca) && pedido.itensTroca.length > 0
            ? `<p style="margin: 0.3rem 0 0.8rem; font-size: 0.85rem; color: var(--cinza-rocha-claro);">
                   <strong>Itens da troca:</strong> ${pedido.itensTroca.map(escaparHtml).join(' | ')}
               </p>`
            : '';

        article.innerHTML = `
            <div class="card-header">
                <div class="card-info">
                    <span class="card-title">Troca / Devolução ref. Pedido #${pedido.codigo || pedido.id} <small>(${dateStr})</small></span>
                    <span class="card-subtitle">Cliente: ${pedido.cliente} | Valor Total: ${formattedPrice}</span>
                </div>
                <span class="status ${statusClass}">${displayName}</span>
            </div>
            <div class="card-body">
                ${motivoHtml}
                ${itensHtml}
                <div class="status-updater">
                    ${updaterHtml}
                </div>
            </div>
        `;

        container.appendChild(article);
    });
}

async function atualizarStatusTroca(pedidoId) {
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
                notificarAdmin(msg, 'sucesso');
            } else {
                notificarAdmin(data.message || 'Status da troca atualizado com sucesso!', 'sucesso');
            }
            carregarDevolucoes();
        } else {
            const err = await response.json().catch(() => ({ message: 'Falha ao atualizar status da troca.' }));
            notificarAdmin(err.message, 'erro');
        }
    } catch (err) {
        console.error(err);
        notificarAdmin('Erro de conexão ao se comunicar com a API.', 'erro');
    }
}

function notificarAdmin(mensagem, tipo = 'erro') {
    if (typeof mostrarNotificacao === 'function') {
        mostrarNotificacao(mensagem, tipo);
        return;
    }
    let container = document.getElementById('notificacoes-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificacoes-container';
        container.className = 'notificacoes-container';
        document.body.appendChild(container);
    }
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.setAttribute('role', 'alert');
    notificacao.textContent = mensagem;
    container.appendChild(notificacao);
    setTimeout(() => notificacao.remove(), 4500);
}
