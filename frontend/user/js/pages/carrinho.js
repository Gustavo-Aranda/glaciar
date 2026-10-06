const API_BASE_URL = 'http://localhost:5205/api';
// Usuário vindo da sessão/URL (usuario-session.js); sem login, redireciona para o login
const USUARIO_ID = exigirIdUsuario();

/* =====================================================================
 * ESTADO LOCAL DO CARRINHO
 * ---------------------------------------------------------------------
 * O "+", o "-" e o "Remover" alteram SOMENTE este estado, sem chamar a API.
 * Os valores exibidos são uma SIMULAÇÃO VISUAL: o preço oficial e o frete
 * são sempre recalculados pelo backend quando o usuário segue para o checkout.
 * ===================================================================== */
const estado = {
    /** Itens como estão na tela agora. */
    itens: [],
    /** Snapshot do servidor: itemId -> quantidade (base para montar o diff). */
    quantidadesOriginais: new Map(),
    /** Frete/total oficiais devolvidos pelo backend (válidos só enquanto não houver alteração local). */
    resumoServidor: { frete: 0, total: 0, temEndereco: false },
    sincronizando: false
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatarMoeda = (valor) => moeda.format(valor ?? 0);

const escaparHtml = (texto = '') =>
    String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const dom = {
    get container() { return document.querySelector('.cart-items-section'); },
    get header() { return document.querySelector('.cart-table-header'); },
    get btnCheckout() { return document.querySelector('.btn-checkout-black'); },
    get subtotal() { return document.querySelector('.summary-details .summary-line:nth-child(1) span:nth-child(2)'); },
    get frete() { return document.querySelector('.summary-details .summary-line:nth-child(2) span:nth-child(2)'); },
    get total() { return document.querySelector('.summary-total span:nth-child(2)'); }
};

/* =====================================================================
 * INICIALIZAÇÃO
 * ===================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    dom.container?.addEventListener('click', tratarCliqueNoCarrinho);
    dom.btnCheckout?.addEventListener('click', realizarCheckout);

    // Evita perder alterações locais ao sair da página sem ir para o checkout
    window.addEventListener('beforeunload', (event) => {
        if (possuiAlteracoesPendentes() && !estado.sincronizando) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    await carregarCarrinho();
});

async function carregarCarrinho() {
    window.LoadingService?.show('Carregando carrinho...');
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/contexto`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });

        if (!response.ok) {
            console.error('Erro ao carregar o contexto do carrinho', await response.text());
            return;
        }

        aplicarEstadoDoServidor(await response.json());
        renderizarCarrinho();
    } catch (error) {
        console.error('Erro de rede ao carregar carrinho:', error);
    } finally {
        window.LoadingService?.hide();
    }
}

/** Converte o contexto da API no estado local e guarda o snapshot original. */
function aplicarEstadoDoServidor(contexto) {
    const carrinho = contexto?.carrinho ?? { itens: [], subtotal: 0 };

    estado.itens = (carrinho.itens ?? []).map((item) => ({
        id: item.id,
        nomeProduto: item.nomeProduto,
        tamanho: item.tamanho,
        cor: item.cor,
        sku: item.sku,
        precoUnitario: item.precoUnitario,
        quantidade: item.quantidade,
        estoqueDisponivel: item.estoqueDisponivel,
        disponivel: item.disponivel
    }));

    estado.quantidadesOriginais = new Map(estado.itens.map(({ id, quantidade }) => [id, quantidade]));

    estado.resumoServidor = {
        frete: contexto?.valorFrete ?? 0,
        total: contexto?.valorTotal ?? carrinho.subtotal ?? 0,
        temEndereco: Boolean(contexto?.enderecoPrincipal)
    };
}

/* =====================================================================
 * CÁLCULOS LOCAIS (apenas visuais)
 * ===================================================================== */
const calcularSubtotalItem = (item) => item.precoUnitario * item.quantidade;
const calcularSubtotal = () => estado.itens.reduce((soma, item) => soma + calcularSubtotalItem(item), 0);
const calcularQuantidadeTotal = () => estado.itens.reduce((soma, item) => soma + item.quantidade, 0);
const buscarItem = (itemId) => estado.itens.find(({ id }) => id === itemId);

/**
 * Diff entre o estado local e o snapshot do servidor.
 * Itens removidos localmente vão com quantidade 0.
 */
function montarPayloadAlteracoes() {
    const atuais = new Map(estado.itens.map(({ id, quantidade }) => [id, quantidade]));

    return [...estado.quantidadesOriginais]
        .map(([itemId, original]) => ({ itemId, quantidade: atuais.get(itemId) ?? 0, original }))
        .filter(({ quantidade, original }) => quantidade !== original)
        .map(({ itemId, quantidade }) => ({ itemId, quantidade }));
}

const possuiAlteracoesPendentes = () => montarPayloadAlteracoes().length > 0;

/* =====================================================================
 * AÇÕES DO USUÁRIO (sem chamadas à API)
 * ===================================================================== */
function tratarCliqueNoCarrinho(event) {
    const botao = event.target.closest('[data-acao]');
    if (!botao || estado.sincronizando) return;

    const itemId = Number(botao.closest('[data-item-id]')?.dataset.itemId);
    if (!itemId) return;

    const acoes = {
        incrementar: () => alterarQuantidade(itemId, +1),
        decrementar: () => alterarQuantidade(itemId, -1),
        remover: () => removerItem(itemId)
    };

    acoes[botao.dataset.acao]?.();
}

function alterarQuantidade(itemId, delta) {
    const item = buscarItem(itemId);
    if (!item) return;

    const limite = Math.max(item.estoqueDisponivel, 1);
    const novaQuantidade = Math.min(Math.max(item.quantidade + delta, 1), limite);

    if (novaQuantidade === item.quantidade) {
        if (delta > 0) window.Toast?.showError('Estoque insuficiente', `Apenas ${item.estoqueDisponivel} unidade(s) disponível(is).`);
        return;
    }

    item.quantidade = novaQuantidade;
    atualizarLinhaItem(item);
    atualizarCabecalho();
    renderizarResumo();
}

function removerItem(itemId) {
    estado.itens = estado.itens.filter(({ id }) => id !== itemId);
    document.querySelector(`[data-item-id="${itemId}"]`)?.remove();

    if (estado.itens.length === 0) {
        // Sem itens não há checkout; persistimos já a remoção para o carrinho não "voltar".
        renderizarCarrinho();
        sincronizarComServidor().catch(() => carregarCarrinho());
        return;
    }

    atualizarCabecalho();
    renderizarResumo();
}

/* =====================================================================
 * CHECKOUT: única requisição de escrita do carrinho
 * ===================================================================== */
async function realizarCheckout() {
    if (estado.sincronizando || estado.itens.length === 0) return;

    if (!possuiAlteracoesPendentes()) {
        window.location.href = 'checkout.html';
        return;
    }

    try {
        await sincronizarComServidor();
        window.location.href = 'checkout.html';
    } catch {
        // Mensagem já exibida; mantém o estado local para o usuário ajustar
    }
}

/** Envia o lote de alterações em um único PUT. O backend devolve os valores oficiais. */
async function sincronizarComServidor() {
    const itens = montarPayloadAlteracoes();
    if (itens.length === 0) return;

    estado.sincronizando = true;
    alternarBotaoCheckout(true, 'Atualizando carrinho...');
    window.LoadingService?.show('Atualizando carrinho...');

    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/itens`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify({ itens })
        });

        if (!response.ok) {
            const { message } = await response.json().catch(() => ({}));
            window.Toast?.showError('Não foi possível atualizar o carrinho', message ?? 'Tente novamente.');
            throw new Error(message);
        }

        // Fonte da verdade: o snapshot passa a ser o que o servidor confirmou
        const carrinhoOficial = await response.json();
        estado.quantidadesOriginais = new Map((carrinhoOficial.itens ?? []).map(({ id, quantidade }) => [id, quantidade]));
    } finally {
        estado.sincronizando = false;
        window.LoadingService?.hide();
        alternarBotaoCheckout(estado.itens.length === 0);
    }
}

/* =====================================================================
 * RENDERIZAÇÃO
 * ===================================================================== */
function renderizarCarrinho() {
    const { container, header } = dom;
    if (!container || !header) return;

    container.querySelectorAll('.cart-item').forEach((el) => el.remove());
    atualizarCabecalho();

    if (estado.itens.length === 0) {
        header.insertAdjacentHTML('afterend', '<p class="cart-item">Seu carrinho está vazio.</p>');
        alternarBotaoCheckout(true);
        renderizarResumo();
        return;
    }

    header.insertAdjacentHTML('afterend', estado.itens.map(templateItem).join(''));
    alternarBotaoCheckout(false);
    renderizarResumo();
}

function templateItem(item) {
    const { id, nomeProduto, tamanho, cor, sku, quantidade, estoqueDisponivel, disponivel } = item;

    return `
        <article class="cart-item" data-item-id="${id}">
            <div class="item-details">
                <div class="item-img" style="background-color: #eee;"></div>
                <div class="item-info">
                    <h3>${escaparHtml(nomeProduto)}</h3>
                    <p>Tamanho: ${escaparHtml(tamanho)}, Cor: ${escaparHtml(cor)}</p>
                    <p>SKU: ${escaparHtml(sku)}</p>
                    ${disponivel ? '' : '<p style="color:red">Indisponível no estoque!</p>'}
                </div>
            </div>

            <div class="item-qty">
                <div class="qty-selector">
                    <button type="button" class="btn-minus" id="btn-minus-${id}" data-acao="decrementar" ${quantidade <= 1 ? 'disabled' : ''}>&minus;</button>
                    <input type="number" id="qty-${id}" value="${quantidade}" min="1" max="${estoqueDisponivel}" readonly>
                    <button type="button" class="btn-plus" id="btn-plus-${id}" data-acao="incrementar" ${quantidade >= estoqueDisponivel ? 'disabled' : ''}>&plus;</button>
                </div>
            </div>

            <div class="item-price-actions">
                <span class="price-tag">${formatarMoeda(calcularSubtotalItem(item))}</span>
                <button type="button" class="btn-remove-text" id="btn-remove-${id}" data-acao="remover">Remover</button>
            </div>
        </article>
    `;
}

/** Atualiza só a linha alterada (sem re-renderizar a lista inteira). */
function atualizarLinhaItem(item) {
    const linha = document.querySelector(`[data-item-id="${item.id}"]`);
    if (!linha) return;

    linha.querySelector(`#qty-${item.id}`).value = item.quantidade;
    linha.querySelector(`#btn-minus-${item.id}`).disabled = item.quantidade <= 1;
    linha.querySelector(`#btn-plus-${item.id}`).disabled = item.quantidade >= item.estoqueDisponivel;
    linha.querySelector('.price-tag').textContent = formatarMoeda(calcularSubtotalItem(item));
}

function atualizarCabecalho() {
    const titulo = dom.header?.querySelector('.th-product');
    if (titulo) titulo.textContent = `Meu carrinho (${calcularQuantidadeTotal()})`;
}

function renderizarResumo() {
    const subtotal = calcularSubtotal();
    const alterado = possuiAlteracoesPendentes();
    const { frete, total, temEndereco } = estado.resumoServidor;

    if (dom.subtotal) dom.subtotal.textContent = formatarMoeda(subtotal);

    if (dom.frete) {
        dom.frete.className = '';
        dom.frete.textContent =
            subtotal <= 0 ? formatarMoeda(0)
            : alterado ? 'Recalculado no checkout'          // frete depende da qtd; só o backend calcula
            : frete > 0 ? formatarMoeda(frete)
            : temEndereco ? formatarMoeda(0) : 'Calculado no checkout';
    }

    if (dom.total) {
        // Sem alterações, exibimos o total oficial; com alterações, apenas a estimativa local.
        dom.total.textContent = formatarMoeda(subtotal <= 0 ? 0 : alterado ? subtotal : total);
    }
}

function alternarBotaoCheckout(desabilitado, texto = 'Continuar para o checkout') {
    const btn = dom.btnCheckout;
    if (!btn) return;

    btn.disabled = desabilitado;
    btn.textContent = texto;
    btn.style.opacity = desabilitado ? '0.5' : '1';
    btn.style.cursor = desabilitado ? 'not-allowed' : 'pointer';
}
