/**
 * pedidos.js - Histórico de Pedidos do Usuário (Glaciar)
 * Gerencia a busca via API, estado de carregamento, tratamento de erros e renderização dinâmica dos pedidos.
 */

const API_BASE_URL = 'http://localhost:5205/api';

// Obtém o ID do usuário autenticado (ou redireciona para login via usuario-session.js)
const USUARIO_ID = exigirIdUsuario();

// Formatadores utilitários
const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarMoeda = (valor) => formatadorMoeda.format(valor ?? 0);

function formatarData(dataIso) {
    if (!dataIso) return 'Data não informada';
    try {
        const data = new Date(dataIso);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dataIso;
    }
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

// Configuração e mapeamento de status
const STATUS_CONFIG = {
    'EmProcessamento': {
        label: 'Em Processamento',
        classeCss: 'status-atencao'
    },
    'PagamentoRealizado': {
        label: 'Pagamento Aprovado',
        classeCss: 'status-neutro'
    },
    'EmTransporte': {
        label: 'Em Transporte',
        classeCss: 'status-neutro'
    },
    'Entregue': {
        label: 'Entregue',
        classeCss: 'status-sucesso'
    },
    'Cancelado': {
        label: 'Cancelado',
        classeCss: 'status-cancelado'
    }
};

function obterInfoStatus(status) {
    return STATUS_CONFIG[status] || {
        label: status || 'Desconhecido',
        classeCss: 'status-neutro'
    };
}

/* =====================================================================
 * INICIALIZAÇÃO
 * ===================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    configurarEventosGlobais();
    await carregarHistoricoPedidos();
});

function configurarEventosGlobais() {
    const container = document.getElementById('orders-container') || document.querySelector('.orders-list');
    if (!container) return;

    // Delegação de eventos para botões dentro dos cards
    container.addEventListener('click', (event) => {
        const btnDetalhes = event.target.closest('[data-acao="toggle-detalhes"]');
        if (btnDetalhes) {
            const pedidoId = btnDetalhes.dataset.pedidoId;
            const drawer = document.getElementById(`detalhes-pedido-${pedidoId}`);
            if (drawer) {
                const escondido = drawer.classList.toggle('hidden');
                btnDetalhes.textContent = escondido ? 'Detalhes' : 'Ocultar Detalhes';
            }
            return;
        }

        const btnConfirmar = event.target.closest('[data-acao="confirmar-recebimento"]');
        if (btnConfirmar) {
            const codigo = btnConfirmar.dataset.codigo;
            alert(`Recebimento do pedido #${codigo} confirmado com sucesso!`);
            return;
        }
    });
}

/* =====================================================================
 * INTEGRAÇÃO COM A API (FETCH)
 * ===================================================================== */
async function carregarHistoricoPedidos() {
    const container = document.getElementById('orders-container') || document.querySelector('.orders-list');
    if (!container) return;

    // 1. Aciona o serviço de carregamento global
    if (window.LoadingService) {
        window.LoadingService.show('Carregando seus pedidos...');
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        // 2. Tratamento de falha HTTP (4xx / 5xx)
        if (!response.ok) {
            let mensagemErro = 'Não foi possível carregar o histórico de pedidos.';
            try {
                const erroData = await response.json();
                if (erroData.message) mensagemErro = erroData.message;
            } catch {
                // Se a resposta não for JSON, mantém mensagem genérica amigável
            }

            exibirErro('Erro ao buscar pedidos', mensagemErro);
            renderizarErro(container, mensagemErro);
            return;
        }

        // 3. Sucesso: processa dados e renderiza
        const pedidos = await response.json();
        renderizarPedidos(container, pedidos);

    } catch (erro) {
        // 4. Tratamento de falha de rede ou exceção inesperada
        console.error('Erro de rede ao buscar pedidos:', erro);
        const mensagemRede = 'Falha ao conectar com o servidor. Por favor, verifique sua conexão.';
        exibirErro('Erro de Conexão', mensagemRede);
        renderizarErro(container, mensagemRede);
    } finally {
        // 5. Oculta o serviço de carregamento global em qualquer desfecho
        if (window.LoadingService) {
            window.LoadingService.hide();
        }
    }
}

/**
 * Exibe notificação de erro usando exclusivamente o NotificationService/Toast
 */
function exibirErro(titulo, mensagem) {
    if (window.NotificationService && typeof window.NotificationService.showError === 'function') {
        window.NotificationService.showError(titulo, mensagem);
    } else if (window.Toast && typeof window.Toast.showError === 'function') {
        window.Toast.showError(titulo, mensagem);
    } else {
        alert(`${titulo}: ${mensagem}`);
    }
}

/* =====================================================================
 * RENDERIZAÇÃO DINÂMICA DO DOM
 * ===================================================================== */
function renderizarPedidos(container, pedidos) {
    container.innerHTML = '';

    // Estado Vazio (Empty State)
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <div class="empty-orders-icon">📦</div>
                <h3>Você ainda não possui pedidos</h3>
                <p>Assim que você concluir sua primeira compra, ela aparecerá aqui para você acompanhar a entrega em tempo real.</p>
                <a href="masculino.html" class="btn btn-primary">Explorar Catálogo</a>
            </div>
        `;
        return;
    }

    // Renderiza cada card de pedido
    pedidos.forEach((pedido) => {
        container.insertAdjacentHTML('beforeend', gerarHtmlCardPedido(pedido));
    });
}

function renderizarErro(container, mensagem) {
    container.innerHTML = `
        <div class="empty-orders">
            <div class="empty-orders-icon">⚠️</div>
            <h3>Não foi possível carregar seus pedidos</h3>
            <p>${escaparHtml(mensagem)}</p>
            <button class="btn btn-secondary" onclick="carregarHistoricoPedidos()">Tentar Novamente</button>
        </div>
    `;
}

/**
 * Monta o template literal de um Card de Pedido completo
 */
function gerarHtmlCardPedido(pedido) {
    const statusInfo = obterInfoStatus(pedido.status);
    const dataFormatada = formatarData(pedido.data);
    const itens = pedido.itens || [];

    // Itens do pedido
    const itensHtml = itens.map((item) => `
        <div class="order-body">
            <div class="product-img" style="background-color: #EEE;"></div>
            <div class="product-details">
                <p class="product-title">
                    <strong>${item.quantidade}x</strong> ${escaparHtml(item.nomeProduto)} 
                    ${item.tamanho ? `&bull; Tam: ${escaparHtml(item.tamanho)}` : ''} 
                    ${item.cor ? `&bull; Cor: ${escaparHtml(item.cor)}` : ''}
                </p>
                <p class="product-price">
                    ${formatarMoeda(item.precoUnitario)} cada (Subtotal: ${formatarMoeda(item.subtotal)})
                </p>
            </div>
        </div>
    `).join('');

    // Botões de ação contextuais conforme o status
    const botoesAcaoHtml = gerarBotoesAcao(pedido);

    // Detalhes extras (endereço, pagamentos, frete, cupons)
    const detalhesHtml = gerarHtmlDetalhesPedido(pedido);

    return `
        <article class="order-card" data-pedido-id="${pedido.id}">
            <div class="order-header">
                <div class="order-info">
                    <span class="order-number">Pedido #${escaparHtml(pedido.codigo || pedido.id)}</span>
                    <span class="order-date">Realizado em: ${dataFormatada}</span>
                </div>
                <span class="status ${statusInfo.classeCss}">${statusInfo.label}</span>
            </div>

            <div class="order-items-group">
                ${itensHtml || '<p style="padding: 1.5rem;">Nenhum produto listado.</p>'}
            </div>

            <div class="order-footer-bar">
                <div class="order-total-summary">
                    <span class="order-total-value">Total do Pedido: <strong>${formatarMoeda(pedido.valorTotal)}</strong></span>
                    ${pedido.valorAbatidoCupons > 0 ? `<span class="order-frete-note" style="color: #2e7d32; font-weight: 500;">Desconto cupom: -${formatarMoeda(pedido.valorAbatidoCupons)}</span>` : ''}
                    ${pedido.valorFrete > 0 ? `<span class="order-frete-note">Inclui frete de ${formatarMoeda(pedido.valorFrete)}</span>` : '<span class="order-frete-note">Frete grátis</span>'}
                </div>
                <div class="order-actions" style="padding: 0;">
                    ${botoesAcaoHtml}
                </div>
            </div>

            ${detalhesHtml}
        </article>
    `;
}

/**
 * Gera botões de ação dinâmicos com base no status do pedido
 */
function gerarBotoesAcao(pedido) {
    const status = pedido.status;
    let html = `
        <button type="button" class="btn btn-secondary" data-acao="toggle-detalhes" data-pedido-id="${pedido.id}">Detalhes</button>
    `;

    if (status === 'EmTransporte') {
        html += `
            <button type="button" class="btn btn-primary" data-acao="confirmar-recebimento" data-codigo="${escaparHtml(pedido.codigo || pedido.id)}">Confirmar Recebimento</button>
        `;
    } else if (status === 'Entregue') {
        html += `
            <a href="devolucoes.html" class="btn btn-warning">Solicitar Troca / Devolução</a>
        `;
    }

    return html;
}

/**
 * Renderiza seção expansível com endereço e resumo financeiro do pedido
 */
function gerarHtmlDetalhesPedido(pedido) {
    const end = pedido.enderecoEntrega;
    const enderecoFormatado = end
        ? `${escaparHtml(end.logradouro)}, ${escaparHtml(end.numero)} ${end.complemento ? `- ${escaparHtml(end.complemento)}` : ''}<br>
           ${escaparHtml(end.bairro)} - ${escaparHtml(end.cidade)}/${escaparHtml(end.estado)}<br>
           CEP: ${escaparHtml(end.cep)}`
        : 'Endereço não informado';

    const pagamentosLinhas = (pedido.pagamentos || []).map((p) => {
        const metodo = p.metodo === 1 ? 'Cartão de Crédito' : 'Outro';
        const infoCartao = p.cartaoUltimosDigitos ? `(${p.cartaoBandeira || 'Cartão'} final ${p.cartaoUltimosDigitos})` : '';
        return `${metodo} ${infoCartao}: ${formatarMoeda(p.valor)}`;
    }).join('<br>');

    const pagamentos = pagamentosLinhas || (pedido.valorAbatidoCupons > 0 ? 'Pago integralmente com Cupom' : 'Informação de pagamento indisponível');

    const descontoCupom = pedido.valorAbatidoCupons > 0
        ? `<p>Desconto Cupons: -${formatarMoeda(pedido.valorAbatidoCupons)}</p>`
        : '';

    return `
        <div class="order-details-drawer hidden" id="detalhes-pedido-${pedido.id}">
            <div class="details-grid">
                <div class="details-col">
                    <h4>Endereço de Entrega</h4>
                    <p>${enderecoFormatado}</p>
                </div>
                <div class="details-col">
                    <h4>Forma de Pagamento</h4>
                    <p>${pagamentos}</p>
                </div>
                <div class="details-col">
                    <h4>Resumo Financeiro</h4>
                    <p>Subtotal Itens: ${formatarMoeda(pedido.subtotal)}</p>
                    <p>Frete: ${formatarMoeda(pedido.valorFrete)}</p>
                    ${descontoCupom}
                    <p><strong>Total: ${formatarMoeda(pedido.valorTotal)}</strong></p>
                </div>
            </div>
        </div>
    `;
}
