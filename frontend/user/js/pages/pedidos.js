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
    'EmAberto': {
        label: 'Em Aberto',
        classeCss: 'status-neutro'
    },
    'EmProcessamento': {
        label: 'Em Processamento',
        classeCss: 'status-atencao'
    },
    'PagamentoRealizado': {
        label: 'Pagamento Aprovado',
        classeCss: 'status-neutro'
    },
    'PagamentoReprovado': {
        label: 'Pagamento Recusado',
        classeCss: 'status-cancelado'
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
    },
    'TrocaSolicitada': {
        label: 'Troca Solicitada',
        classeCss: 'status-atencao'
    },
    'TrocaAceita': {
        label: 'Troca Autorizada',
        classeCss: 'status-sucesso'
    },
    'TrocaNegada': {
        label: 'Troca Recusada',
        classeCss: 'status-cancelado'
    },
    'ItemEnviado': {
        label: 'Item Enviado (Devolução)',
        classeCss: 'status-neutro'
    },
    'ItemRecebido': {
        label: 'Item Recebido na Glaciar',
        classeCss: 'status-atencao'
    },
    'Trocado': {
        label: 'Troca Concluída (Cupom Gerado)',
        classeCss: 'status-sucesso'
    }
};

function obterInfoStatus(status) {
    return STATUS_CONFIG[status] || {
        label: status || 'Desconhecido',
        classeCss: 'status-neutro'
    };
}

// Estado em memória dos pedidos carregados
let _pedidosCarregados = [];

/* =========================================
 * INICIALIZAÇÃO
 * ========================================= */
document.addEventListener('DOMContentLoaded', async () => {
    configurarEventosGlobais();
    configurarModalTroca();
    await carregarHistoricoPedidos();
    await carregarNotificacoesUsuario();
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
            const pedidoId = btnConfirmar.dataset.pedidoId;
            const codigo = btnConfirmar.dataset.codigo;
            confirmarRecebimento(pedidoId, codigo);
            return;
        }

        const btnTroca = event.target.closest('[data-acao="solicitar-troca"]');
        if (btnTroca) {
            const pedidoId = Number(btnTroca.dataset.pedidoId);
            abrirModalTroca(pedidoId);
            return;
        }

        const btnDespacho = event.target.closest('[data-acao="confirmar-despacho"]');
        if (btnDespacho) {
            const pedidoId = Number(btnDespacho.dataset.pedidoId);
            const codigo = btnDespacho.dataset.codigo;
            confirmarDespacho(pedidoId, codigo);
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
        _pedidosCarregados = Array.isArray(pedidos) ? pedidos : [];
        renderizarPedidos(container, _pedidosCarregados);

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
    if (window.Toast && typeof window.Toast.showError === 'function') {
        window.Toast.showError(titulo, mensagem);
    } else if (window.NotificationService && typeof window.NotificationService.showError === 'function') {
        window.NotificationService.showError(titulo, mensagem);
    } else {
        console.error(`${titulo}: ${mensagem}`);
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
            <button type="button" class="btn btn-primary" data-acao="confirmar-recebimento" data-pedido-id="${pedido.id}" data-codigo="${escaparHtml(pedido.codigo || pedido.id)}">Confirmar Recebimento</button>
        `;
    } else if (status === 'Entregue') {
        html += `
            <button type="button" class="btn btn-warning" data-acao="solicitar-troca" data-pedido-id="${pedido.id}">Solicitar Troca</button>
        `;
    } else if (status === 'TrocaAceita') {
        html += `
            <button type="button" class="btn btn-primary" data-acao="confirmar-despacho" data-pedido-id="${pedido.id}" data-codigo="${escaparHtml(pedido.codigo || pedido.id)}">Informar Despacho do Pacote</button>
        `;
    } else if (['TrocaSolicitada', 'ItemEnviado', 'ItemRecebido', 'Trocado'].includes(status)) {
        html += `
            <a href="devolucoes.html" class="btn btn-secondary">Acompanhar Devolução</a>
        `;
    }

    return html;
}

/**
 * Envia PATCH à API para transicionar o pedido de EmTransporte para Entregue
 */
async function confirmarRecebimento(pedidoId, codigo) {
    const confirmou = await Toast.confirm(
        'Confirmar Recebimento',
        `Deseja confirmar o recebimento de todos os itens do pedido #${codigo}?`,
        { confirmText: 'Confirmar Recebimento', cancelText: 'Voltar', icon: '📦' }
    );
    if (!confirmou) return;

    if (window.LoadingService) window.LoadingService.show('Confirmando recebimento...');
    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify({ status: 'Entregue' })
        });

        if (response.ok) {
            Toast.showSuccess('Recebimento Confirmado', `Pedido #${codigo} marcado como Entregue!`);
            await carregarHistoricoPedidos();
        } else {
            const err = await response.json().catch(() => ({ message: 'Erro ao confirmar recebimento.' }));
            exibirErro('Atenção', err.message);
        }
    } catch (e) {
        console.error(e);
        exibirErro('Erro de Conexão', 'Não foi possível se comunicar com o servidor.');
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
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

/* =========================================
 * MODAL DE TROCA / DEVOLUÇÃO (Fase 2)
 * ========================================= */
function configurarModalTroca() {
    const modal = document.getElementById('modal-troca');
    if (!modal) return;

    document.getElementById('btn-fechar-modal-troca')?.addEventListener('click', fecharModalTroca);
    document.getElementById('btn-cancelar-modal-troca')?.addEventListener('click', fecharModalTroca);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) fecharModalTroca();
    });

    const radioParcial = document.getElementById('radio-troca-parcial');
    const radioTotal = document.getElementById('radio-troca-total');
    const containerItens = document.getElementById('container-selecao-itens');

    radioParcial?.addEventListener('change', () => {
        if (containerItens) containerItens.style.display = 'block';
    });

    radioTotal?.addEventListener('change', () => {
        if (containerItens) containerItens.style.display = 'none';
    });

    document.getElementById('form-solicitar-troca')?.addEventListener('submit', submeterSolicitacaoTroca);
}

function abrirModalTroca(pedidoId) {
    const pedido = _pedidosCarregados.find(p => p.id === pedidoId);
    if (!pedido) {
        exibirErro('Erro', 'Pedido não encontrado.');
        return;
    }

    const modal = document.getElementById('modal-troca');
    const inputPedidoId = document.getElementById('troca-pedido-id');
    const listaItens = document.getElementById('troca-itens-lista');
    const textareaMotivo = document.getElementById('troca-motivo');
    const radioParcial = document.getElementById('radio-troca-parcial');
    const containerItens = document.getElementById('container-selecao-itens');

    if (inputPedidoId) inputPedidoId.value = pedido.id;
    if (textareaMotivo) textareaMotivo.value = '';
    if (radioParcial) radioParcial.checked = true;
    if (containerItens) containerItens.style.display = 'block';

    const titulo = document.getElementById('modal-troca-titulo');
    if (titulo) titulo.textContent = `Solicitar Troca do Pedido #${pedido.codigo || pedido.id}`;

    if (listaItens) {
        listaItens.innerHTML = '';
        const itens = pedido.itens || [];

        itens.forEach(item => {
            const linha = document.createElement('div');
            linha.className = 'troca-item-linha';
            linha.innerHTML = `
                <div class="troca-item-info">
                    <input type="checkbox" class="troca-item-checkbox" data-item-id="${item.id}" id="chk-item-${item.id}" checked>
                    <div class="troca-item-detalhes">
                        <label for="chk-item-${item.id}" class="troca-item-nome">${escaparHtml(item.nomeProduto)}</label>
                        <span class="troca-item-sub">Comprado: ${item.quantidade}x ${formatarMoeda(item.precoUnitario)}</span>
                    </div>
                </div>
                <div class="troca-item-qtd-control">
                    <label for="qtd-item-${item.id}">Qtd:</label>
                    <input type="number" 
                           id="qtd-item-${item.id}" 
                           class="troca-item-qtd-input" 
                           data-item-id="${item.id}" 
                           min="1" 
                           max="${item.quantidade}" 
                           value="${item.quantidade}">
                </div>
            `;
            listaItens.appendChild(linha);
        });
    }

    modal?.classList.remove('hidden');
}

function fecharModalTroca() {
    const modal = document.getElementById('modal-troca');
    modal?.classList.add('hidden');
}

async function submeterSolicitacaoTroca(event) {
    event.preventDefault();

    const pedidoId = Number(document.getElementById('troca-pedido-id')?.value);
    const motivo = document.getElementById('troca-motivo')?.value?.trim();
    const trocaTotal = document.getElementById('radio-troca-total')?.checked;

    if (!motivo) {
        exibirErro('Atenção', 'Informe o motivo da troca.');
        return;
    }

    const payload = {
        motivo: motivo,
        trocarPedidoInteiro: !!trocaTotal,
        itens: []
    };

    if (!trocaTotal) {
        const checkboxes = document.querySelectorAll('.troca-item-checkbox:checked');
        if (checkboxes.length === 0) {
            exibirErro('Atenção', 'Selecione pelo menos um item para trocar.');
            return;
        }

        checkboxes.forEach(chk => {
            const itemId = Number(chk.dataset.itemId);
            const inputQtd = document.querySelector(`.troca-item-qtd-input[data-item-id="${itemId}"]`);
            const quantidade = inputQtd ? Number(inputQtd.value) : 1;

            payload.itens.push({
                pedidoProdutoId: itemId,
                quantidade: quantidade
            });
        });
    }

    if (window.LoadingService) window.LoadingService.show('Enviando solicitação de troca...');

    try {
        const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/troca`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            fecharModalTroca();
            const msg = 'Sua solicitação de troca foi registrada com sucesso! Nossa equipe irá avaliá-la.';
            Toast.showSuccess('Troca Solicitada', msg);
            await carregarHistoricoPedidos();
        } else {
            const err = await response.json().catch(() => ({ message: 'Erro ao solicitar troca.' }));
            exibirErro('Não foi possível solicitar a troca', err.message);
        }
    } catch (e) {
        console.error(e);
        exibirErro('Erro de Conexão', 'Não foi possível se comunicar com o servidor.');
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

/**
 * Cliente informa que despachou o pacote nos correios (TrocaAceita -> ItemEnviado)
 */
async function confirmarDespacho(pedidoId, codigo) {
    const confirmou = await Toast.confirm(
        'Confirmar Despacho',
        `Confirmar que você despachou nos Correios o pacote de troca referente ao pedido #${codigo}?`,
        { confirmText: 'Confirmar Envio', cancelText: 'Voltar', icon: '🚚' }
    );
    if (!confirmou) return;

    if (window.LoadingService) window.LoadingService.show('Registrando despacho do pacote...');
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
            const msg = `Despacho informado com sucesso! Assim que a mercadoria chegar ao nosso centro de distribuição, realizaremos a conferência.`;
            Toast.showSuccess('Pacote Despachado', msg);
            await carregarHistoricoPedidos();
        } else {
            const err = await response.json().catch(() => ({ message: 'Erro ao atualizar status.' }));
            exibirErro('Atenção', err.message);
        }
    } catch (e) {
        console.error(e);
        exibirErro('Erro de Conexão', 'Não foi possível se comunicar com o servidor.');
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

/* =========================================
 * NOTIFICAÇÕES DO CLIENTE (Fase 2)
 * ========================================= */
async function carregarNotificacoesUsuario() {
    const container = document.getElementById('notificacoes-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/notificacoes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        if (!response.ok) return;

        const notificacoes = await response.json();
        const naoLidas = Array.isArray(notificacoes) ? notificacoes.filter(n => !n.lida) : [];

        if (naoLidas.length === 0) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = naoLidas.map(notif => `
            <div class="notificacao-card-alerta tipo-troca" id="notificacao-${notif.id}">
                <div class="notificacao-card-conteudo">
                    <span class="notificacao-card-titulo">📢 ${escaparHtml(notif.titulo)}</span>
                    <span class="notificacao-card-texto">${escaparHtml(notif.mensagem)}</span>
                </div>
                <button type="button" class="notificacao-btn-fechar" onclick="marcarNotificacaoComoLida(${notif.id})">
                    Marcar como lida
                </button>
            </div>
        `).join('');

    } catch (e) {
        console.warn('Não foi possível verificar notificações:', e);
    }
}

async function marcarNotificacaoComoLida(notificacaoId) {
    try {
        await fetch(`${API_BASE_URL}/notificacoes/${notificacaoId}/lida`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        const elemento = document.getElementById(`notificacao-${notificacaoId}`);
        if (elemento) {
            elemento.remove();
        }

        const container = document.getElementById('notificacoes-container');
        if (container && container.children.length === 0) {
            container.classList.add('hidden');
        }
    } catch (e) {
        console.error('Erro ao marcar notificação como lida:', e);
    }
}

