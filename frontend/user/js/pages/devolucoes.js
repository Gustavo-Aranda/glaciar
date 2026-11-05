/**
 * devolucoes.js - Gestão e Acompanhamento de Trocas e Devoluções do Usuário (Glaciar)
 */

const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = exigirIdUsuario();

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarMoeda = (valor) => formatadorMoeda.format(valor ?? 0);

// Mapa de imagens locais para renderização otimizada e clean
const IMAGENS_PRODUTOS = {
    1: './assets/img/masculino/termica-apex.jpg',
    2: './assets/img/masculino/alpine-pro.jpg',
    3: './assets/img/calcados/bota-montanhismo.jpg',
    4: './assets/img/masculino/stormbreaker.jpg',
    5: './assets/img/masculino/ridge-cargo.jpg',
    6: './assets/img/feminino/calca-ascent.jpg',
    7: './assets/img/feminino/jaqueta-aurora.jpg',
    8: './assets/img/feminino/segunda-pele-merino.jpg',
    9: './assets/img/calcados/tenis-trekking.jpg',
    10: './assets/img/calcados/bota-alpinismo.jpg',
    11: './assets/img/equipamentos/mochila-covert.jpg',
    12: './assets/img/equipamentos/barraca-k2.jpg',
    13: './assets/img/equipamentos/saco-subzero.jpg'
};

function resolverImagemProduto(item) {
    if (!item) return './assets/img/masculino/alpine-pro.jpg';
    if (item.imagem) return item.imagem;
    const prodId = item.produtoId || item.ProdutoId || item.id;
    if (prodId && IMAGENS_PRODUTOS[prodId]) return IMAGENS_PRODUTOS[prodId];

    const nome = (item.nomeProduto || item.nome || '').toLowerCase();
    if (nome.includes('apex')) return './assets/img/masculino/termica-apex.jpg';
    if (nome.includes('alpine')) return './assets/img/masculino/alpine-pro.jpg';
    if (nome.includes('stormbreaker')) return './assets/img/masculino/stormbreaker.jpg';
    if (nome.includes('ridge')) return './assets/img/masculino/ridge-cargo.jpg';
    if (nome.includes('ascent')) return './assets/img/feminino/calca-ascent.jpg';
    if (nome.includes('aurora')) return './assets/img/feminino/jaqueta-aurora.jpg';
    if (nome.includes('merino')) return './assets/img/feminino/segunda-pele-merino.jpg';
    if (nome.includes('trekking xt') || nome.includes('trekking')) return './assets/img/calcados/bota-montanhismo.jpg';
    if (nome.includes('trailblaze')) return './assets/img/calcados/tenis-trekking.jpg';
    if (nome.includes('summit')) return './assets/img/calcados/bota-alpinismo.jpg';
    if (nome.includes('covert')) return './assets/img/equipamentos/mochila-covert.jpg';
    if (nome.includes('k2')) return './assets/img/equipamentos/barraca-k2.jpg';
    if (nome.includes('subzero')) return './assets/img/equipamentos/saco-subzero.jpg';

    return './assets/img/masculino/alpine-pro.jpg';
}

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
        mensagem: 'Troca finalizada! Cupom de Troca emitido na sua conta.',
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

        // Exibe SOMENTE os itens (PedidoProduto) incluídos na troca. O fallback para pedido.itens
        // existe apenas para respostas legadas que ainda não trazem "itensEmTroca".
        const itensEmTroca = Array.isArray(pedido.itensEmTroca) && pedido.itensEmTroca.length > 0
            ? pedido.itensEmTroca
            : (pedido.itens || []);
        const itensHtml = itensEmTroca.map(item => {
            const imgUrl = resolverImagemProduto(item);
            const creditoHtml = item.valor > 0
                ? ` &bull; Crédito previsto: ${formatarMoeda(item.valor)}`
                : '';
            return `
            <div class="return-body">
                <img class="product-img" 
                     src="${imgUrl}" 
                     alt="${escaparHtml(item.nomeProduto || 'Produto')}" 
                     loading="lazy" 
                     decoding="async" 
                     onerror="this.onerror=null; this.src='./assets/img/masculino/alpine-pro.jpg';">
                <div class="product-details">
                    <p class="product-title">${item.quantidade}x ${escaparHtml(item.nomeProduto)}</p>
                    <p class="product-reason">Preço: ${formatarMoeda(item.precoUnitario)}${creditoHtml}</p>
                    <p class="${info.tipoMensagem}">
                        ${info.mensagem}
                        ${pedido.status === 'TrocaAceita' ? `<br>Código Reverso dos Correios: <strong>REV-${escaparHtml(pedido.codigo || pedido.id)}</strong>` : ''}
                    </p>
                </div>
            </div>
            `;
        }).join('');

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

        const motivoHtml = pedido.motivoTroca
            ? `<div class="return-reason-box" style="margin: 0.5rem 0 0.8rem; padding: 0.6rem 0.9rem; background: var(--fundo-app, #F5F7FA); border-left: 3px solid var(--azul-gelo, #2B4C7E); border-radius: 4px;">
                   <span style="font-size: 0.8rem; font-weight: 600; color: var(--cinza-rocha); display: block; margin-bottom: 0.2rem;">Motivo da solicitação de troca:</span>
                   <span style="font-size: 0.85rem; color: var(--cinza-rocha-claro); font-style: italic;">"${escaparHtml(pedido.motivoTroca)}"</span>
               </div>`
            : '';

        const card = `
            <article class="return-card">
                <div class="return-header">
                    <div class="return-info">
                        <span class="return-number">Troca #${escaparHtml(pedido.codigo || pedido.id)}</span>
                        <span class="return-date">Ref. ao Pedido: #${escaparHtml(pedido.codigo || pedido.id)}</span>
                    </div>
                    <span class="status ${info.classeCss}">${info.label}</span>
                </div>
                ${motivoHtml}
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
    let confirmou = true;
    if (window.Toast && typeof window.Toast.confirm === 'function') {
        confirmou = await window.Toast.confirm(
            'Confirmar Despacho',
            `Deseja confirmar que você despachou o pacote nos Correios para a Glaciar referente ao pedido #${codigo}?`,
            { confirmText: 'Sim, despachei', cancelText: 'Voltar', icon: '📦' }
        );
    }
    if (!confirmou) return;

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
            if (window.Toast && typeof window.Toast.showSuccess === 'function') {
                window.Toast.showSuccess('Pacote Enviado', 'Despacho registrado com sucesso!');
            } else if (window.NotificationService && typeof window.NotificationService.showSuccess === 'function') {
                window.NotificationService.showSuccess('Pacote Enviado', 'Despacho registrado com sucesso!');
            }
            await carregarDevolucoes();
        } else {
            const err = await response.json().catch(() => ({ message: 'Erro ao informar despacho.' }));
            if (window.Toast && typeof window.Toast.showError === 'function') {
                window.Toast.showError('Atenção', err.message);
            } else if (window.NotificationService && typeof window.NotificationService.showError === 'function') {
                window.NotificationService.showError('Atenção', err.message);
            }
        }
    } catch (e) {
        console.error(e);
        if (window.Toast && typeof window.Toast.showError === 'function') {
            window.Toast.showError('Erro de conexão', 'Erro ao se conectar ao servidor.');
        }
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}
