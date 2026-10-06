const API_BASE_URL = 'http://localhost:5205/api';
// O usuário vem da sessão/URL (usuario-session.js); o backend lê o header X-Usuario-Id
const CATEGORIA_PAGINA = 'Masculino';

// Mapa de nomes de cor -> hex para os swatches (cores desconhecidas usam cinza)
const CORES_HEX = {
    'preto': '#111111', 'branco': '#f5f5f5', 'cinza': '#808080', 'azul': '#2c3e50',
    'azul marinho': '#1b2a41', 'vermelho': '#a8201a', 'verde': '#2e5e3e', 'bordo': '#6a2e41',
    'bege': '#d9c7a3', 'marrom': '#5b3a29', 'amarelo': '#e0b43a', 'laranja': '#d9772b'
};

const estadoProdutos = new Map(); // produtoId -> { produto, corSelecionada }

document.addEventListener('DOMContentLoaded', carregarProdutos);

async function carregarProdutos() {
    const grid = document.getElementById('products-grid');
    const contador = document.getElementById('items-count');
    if (!grid) return;

    try {
        const response = await fetch(`${API_BASE_URL}/produtos?categoria=${encodeURIComponent(CATEGORIA_PAGINA)}`);
        if (!response.ok) throw new Error(await response.text());

        const produtos = await response.json();
        grid.innerHTML = '';
        produtos.forEach(p => {
            estadoProdutos.set(p.id, { produto: p, corSelecionada: coresDoProduto(p)[0] });
            grid.appendChild(criarCard(p));
        });

        if (contador) contador.textContent = `${produtos.length} ${produtos.length === 1 ? 'Item' : 'Itens'}`;
        if (produtos.length === 0) grid.innerHTML = '<p>Nenhum produto encontrado.</p>';
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        grid.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
    }
}

function coresDoProduto(produto) {
    return [...new Set(produto.estoques.map(e => e.cor))];
}

function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

function formatarPreco(valor) {
    return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function criarCard(produto) {
    const cores = coresDoProduto(produto);
    const article = document.createElement('article');
    article.className = 'product-card';
    article.dataset.produtoId = produto.id;

    const swatches = cores.map((cor, i) =>
        `<span class="swatch ${i === 0 ? 'checked' : ''}" title="${escapeHtml(cor)}"
            style="background: ${CORES_HEX[cor.toLowerCase()] || '#999'}; cursor: pointer;"
            onclick="selecionarCor(${produto.id}, '${escapeHtml(cor).replace(/'/g, "\\'")}', this)"></span>`
    ).join('');

    article.innerHTML = `
        <div class="product-img-wrapper">
            <span class="badge badge-white">Novo</span>
            <a href="produto.html?produto=${produto.id}" class="img-link">
                <div class="img-placeholder" style="background-image: url(./assets/img/destaque-1.jpg)"></div>
            </a>

            <button class="btn-quick-add" onclick="toggleSizeSelector(this)">Adição Rápida</button>

            <div class="size-selector-overlay hidden"></div>
        </div>

        <div class="product-info">
            <div class="color-swatches">${swatches}</div>
            <h3 class="product-title"><a href="produto.html?produto=${produto.id}">${escapeHtml(produto.nome)}</a></h3>
            <p class="product-price">${formatarPreco(produto.preco)}</p>
            <div class="product-tags"><span class="tag">${escapeHtml(produto.tipo)}</span></div>
        </div>
    `;

    renderizarTamanhos(article, produto.id);
    return article;
}

// Monta a grade de tamanhos de acordo com a cor selecionada
function renderizarTamanhos(article, produtoId) {
    const { produto, corSelecionada } = estadoProdutos.get(produtoId);
    const overlay = article.querySelector('.size-selector-overlay');
    overlay.innerHTML = '';

    produto.estoques
        .filter(e => e.cor === corSelecionada)
        .forEach(e => {
            const btn = document.createElement('button');
            btn.className = 'btn-size';
            btn.textContent = e.tamanho;
            if (e.quantidade <= 0) {
                btn.classList.add('disabled');
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => addToBag(produto, e));
            }
            overlay.appendChild(btn);
        });

    const fechar = document.createElement('button');
    fechar.className = 'btn-close-sizes';
    fechar.innerHTML = '&times;';
    fechar.addEventListener('click', () => toggleSizeSelector(overlay));
    overlay.appendChild(fechar);
}

function selecionarCor(produtoId, cor, swatchEl) {
    const estado = estadoProdutos.get(produtoId);
    estado.corSelecionada = cor;

    const article = swatchEl.closest('.product-card');
    article.querySelectorAll('.swatch').forEach(s => s.classList.remove('checked'));
    swatchEl.classList.add('checked');
    renderizarTamanhos(article, produtoId);
}

// Mostra/Esconde a grade de tamanhos no Card
function toggleSizeSelector(element) {
    // Busca o pai (o wrapper da imagem)
    const wrapper = element.closest('.product-img-wrapper');
    const sizeOverlay = wrapper.querySelector('.size-selector-overlay');
    const quickAddBtn = wrapper.querySelector('.btn-quick-add');

    if (sizeOverlay.classList.contains('hidden')) {
        sizeOverlay.classList.remove('hidden');
        quickAddBtn.style.display = 'none'; // Esconde o botão original
    } else {
        sizeOverlay.classList.add('hidden');
        quickAddBtn.style.display = 'block'; // Mostra o botão original
    }
}

// Adiciona o item (estoque escolhido) ao carrinho via API e abre o Toast
async function addToBag(produto, estoque) {
    const usuarioId = exigirIdUsuario();
    if (!usuarioId) return;
    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/itens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': usuarioId.toString()
            },
            body: JSON.stringify({ estoqueId: estoque.estoqueId, quantidade: 1 })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            alert(err?.message || 'Não foi possível adicionar o item ao carrinho.');
            return;
        }

        document.getElementById('toast-title').textContent = `1x ${produto.nome}`;
        document.getElementById('toast-price').textContent = formatarPreco(produto.preco);
        document.getElementById('toast-color').textContent = estoque.cor;
        document.getElementById('toast-size').textContent = estoque.tamanho;
        document.getElementById('cart-toast').classList.remove('hidden');

        // Oculta todas as grades de tamanho que estiverem abertas
        document.querySelectorAll('.size-selector-overlay').forEach(overlay => overlay.classList.add('hidden'));
        document.querySelectorAll('.btn-quick-add').forEach(btn => btn.style.display = 'block');
    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        alert('Erro de conexão com o servidor.');
    }
}

// Fecha o Toast
function closeToast() {
    const toast = document.getElementById('cart-toast');
    toast.classList.add('hidden');
}