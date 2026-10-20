/**
 * devolucoes.js - Gestão e Acompanhamento de Trocas e Devoluções do Usuário (Glaciar)
 */

const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = exigirIdUsuario();

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarMoeda = (valor) => formatadorMoeda.format(valor ?? 0);

function escaparHtml(texto = '') {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

const STATUS_TROCA_MAP = {
    'TrocaSolicitada': {
        label: 'Aguardando Avaliação',
        classeCss: 'status-atencao',
        mensagem: 'Sua solicitação foi recebida e está em análise pela equipe Glaciar.',
        tipoMensagem: 'info-text'
    },
    'TrocaAceita': {
        label: 'Troca Autorizada',
        classeCss: 'status-sucesso',
        mensagem: 'Troca autorizada! Despache o produto nos Correios com o código de postagem reversa.',
        tipoMensagem: 'alert-text'
    },
    'TrocaNegada': {
        label: 'Troca Recusada',
        classeCss: 'status-cancelado',
        mensagem: 'Infelizmente a solicitação de troca deste pedido não foi aprovada.',
        tipoMensagem: 'alert-text'
    },
    'ItemEnviado': {
        label: 'Item Despachado',
        classeCss: 'status-neutro',
        mensagem: 'Mercadoria em trânsito para o Centro de Distribuição da Glaciar.',
        tipoMensagem: 'info-text'
    },
    'ItemRecebido': {
        label: 'Item Recebido na Glaciar',
        classeCss: 'status-atencao',
        mensagem: 'Pacote recebido. Realizando conferência física e triagem de estoque.',
        tipoMensagem: 'info-text'
    },
    'Trocado': {
        label: 'Troca Concluída',
        classeCss: 'status-sucesso',
        mensagem: 'Troca finalizada! Mercadoria reintegrada ao estoque e Cupom de Troca emitido na sua conta.',
        tipoMensagem: 'success-text'
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    configurarEventos();
    await carregarDevolucoes();
});

function configurarEventos() {
    const container = document.getElementById('returns-container');
    if (!container) return;

    container.addEventListener('click', async (event) => {
        const btnDespacho = event.target.closest('[data-acao="despachar-item"]');
        if (btnDespacho) {
            const pedidoId = Number(btnDespacho.dataset.pedidoId);
            const codigo = btnDespacho.dataset.codigo;
            await confirmarDespacho(pedidoId, codigo);
        }
    });
}

async function carregarDevolucoes() {
    const container = document.getElementById('returns-container');
    if (!container) return;

    if (window.LoadingService) window.LoadingService.show('Carregando trocas e devoluções...');

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        if (!response.ok) {
            renderizarErro(container, 'Não foi possível carregar as devoluções.');
            return;
        }

        const pedidos = await response.json();
        const devolucoes = (Array.isArray(pedidos) ? pedidos : []).filter(p =>
            STATUS_TROCA_MAP.hasOwnProperty(p.status)
        );

        renderizarDevolucoes(container, devolucoes);

    } catch (e) {
        console.error(e);
        renderizarErro(container, 'Erro de conexão com o servidor.');
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

function renderizarDevolucoes(container, devolucoes) {
    container.innerHTML = '';

    if (!devolucoes || devolucoes.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem; background: var(--branco); border: 1px dashed var(--borda-cinza); border-radius: 8px;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.7;">🔄</div>
                <h3 style="color: var(--cinza-rocha); font-size: 1.3rem; margin-bottom: 0.5rem;">Nenhuma devolução ou troca ativa</h3>
                <p style="color: var(--cinza-rocha-claro); margin-bottom: 1.5rem;">Quando você solicitar a troca de um pedido entregue, você poderá acompanhar todo o fluxo por aqui.</p>
                <a href="pedidos.html" class="btn btn-primary" style="text-decoration: none;">Acessar Meus Pedidos</a>
            </div>
        `;
        return;
    }

    devolucoes.forEach(pedido => {
        const info = STATUS_TROCA_MAP[pedido.status] || {
            label: pedido.status,
            classeCss: 'status-neutro',
            mensagem: '',
            tipoMensagem: 'info-text'
        };

        const itens = pedido.itens || [];
        const itensHtml = itens.map(item => `
            <div class="return-body">
                <div class="product-img" style="background-color: #EEE;"></div>
                <div class="product-details">
                    <p class="product-title">${item.quantidade}x ${escaparHtml(item.nomeProduto)}</p>
                    <p class="product-reason">Preço: ${formatarMoeda(item.precoUnitario)}</p>
                    <p class="${info.tipoMensagem}">
                        ${info.mensagem}
                        ${pedido.status === 'TrocaAceita' ? `<br>Código Reverso dos Correios: <strong>REV-${escaparHtml(pedido.codigo || pedido.id)}</strong>` : ''}
                    </p>
                </div>
            </div>
        `).join('');

        let acoesHtml = '';
        if (pedido.status === 'TrocaAceita') {
            acoesHtml = `
                <div class="return-actions">
                    <button type="button" class="btn btn-primary" data-acao="despachar-item" data-pedido-id="${pedido.id}" data-codigo="${escaparHtml(pedido.codigo || pedido.id)}">
                        Informar Rastreio de Despacho
                    </button>
                </div>
            `;
        } else if (pedido.status === 'Trocado') {
            acoesHtml = `
                <div class="return-actions">
                    <a href="conta.html" class="btn btn-info" style="text-decoration: none;">Ver Saldo em Minha Conta</a>
                </div>
            `;
        }

        const card = `
            <article class="return-card">
                <div class="return-header">
                    <div class="return-info">
                        <span class="return-number">Troca #${escaparHtml(pedido.codigo || pedido.id)}</span>
                        <span class="return-date">Ref. ao Pedido: #${escaparHtml(pedido.codigo || pedido.id)}</span>
                    </div>
                    <span class="status ${info.classeCss}">${info.label}</span>
                </div>
                ${itensHtml}
                ${acoesHtml}
            </article>
        `;

        container.insertAdjacentHTML('beforeend', card);
    });
}

function renderizarErro(container, mensagem) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; background: var(--branco); border-radius: 8px;">
            <p style="color: #C0392B;">${escaparHtml(mensagem)}</p>
            <button class="btn btn-warning" onclick="carregarDevolucoes()" style="margin-top: 1rem;">Tentar Novamente</button>
        </div>
    `;
}

async function confirmarDespacho(pedidoId, codigo) {
    if (!confirm(`Confirmar que você despachou o pacote nos Correios para a Glaciar referente ao pedido #${codigo}?`)) return;

    if (window.LoadingService) window.LoadingService.show('Informando despacho...');

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify({ status: 'ItemEnviado' })
        });

        if (response.ok) {
            if (window.NotificationService && typeof window.NotificationService.showSuccess === 'function') {
                window.NotificationService.showSuccess('Pacote Enviado', 'Despacho registrado com sucesso!');
            } else if (window.Toast && typeof window.Toast.showSuccess === 'function') {
                window.Toast.showSuccess('Pacote Enviado', 'Despacho registrado com sucesso!');
            } else {
                alert('Despacho registrado com sucesso!');
            }
            await carregarDevolucoes();
        } else {
            const err = await response.json().catch(() => ({ message: 'Erro ao informar despacho.' }));
            if (window.NotificationService) window.NotificationService.showError('Atenção', err.message);
            else alert(err.message);
        }
    } catch (e) {
        console.error(e);
        alert('Erro ao se conectar ao servidor.');
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}
