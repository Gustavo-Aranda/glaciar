// frontend/js/pages/produto.js

const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = exigirIdUsuario();

let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let selectedEstoqueId = null;

// Map de cores (pode ser expandido conforme necessário)
const colorMap = {
    'preto': '#111',
    'azul': '#2c3e50',
    'berry fig': '#6a2e41',
    'branco': '#fff',
    'cinza': '#999'
};

// Map de imagens locais por ID de Produto
const productImageMap = {
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

function getProductImageUrl(product) {
    if (!product) return './assets/img/masculino/alpine-pro.jpg';
    if (product.imagem) return product.imagem;
    const prodId = product.id || product.Id;
    if (prodId && productImageMap[prodId]) return productImageMap[prodId];
    
    // Fallback por correspondência no nome
    const nome = (product.nome || '').toLowerCase();
    if (nome.includes('apex')) return './assets/img/masculino/termica-apex.jpg';
    if (nome.includes('alpine')) return './assets/img/masculino/alpine-pro.jpg';
    if (nome.includes('stormbreaker')) return './assets/img/masculino/stormbreaker.jpg';
    if (nome.includes('ridge')) return './assets/img/masculino/ridge-cargo.jpg';
    if (nome.includes('ascent')) return './assets/img/feminino/calca-ascent.jpg';
    if (nome.includes('aurora')) return './assets/img/feminino/jaqueta-aurora.jpg';
    if (nome.includes('merino')) return './assets/img/feminino/segunda-pele-merino.jpg';
    if (nome.includes('trekking xt')) return './assets/img/calcados/bota-montanhismo.jpg';
    if (nome.includes('trailblaze')) return './assets/img/calcados/tenis-trekking.jpg';
    if (nome.includes('summit')) return './assets/img/calcados/bota-alpinismo.jpg';
    if (nome.includes('covert')) return './assets/img/equipamentos/mochila-covert.jpg';
    if (nome.includes('k2')) return './assets/img/equipamentos/barraca-k2.jpg';
    if (nome.includes('subzero')) return './assets/img/equipamentos/saco-subzero.jpg';

    return './assets/img/masculino/alpine-pro.jpg';
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('produto');

    if (!produtoId) {
        if (window.Toast) window.Toast.showError('Erro', 'Produto não especificado.');
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
        return;
    }

    await loadProductData(produtoId);

    document.getElementById('btn-add-to-bag').addEventListener('click', addToBag);
});

async function loadProductData(produtoId) {
    if (window.LoadingService) window.LoadingService.show('Carregando produto...');
    try {
        const response = await fetch(`${API_BASE_URL}/produtos/${produtoId}`);
        if (!response.ok) throw new Error("Produto não encontrado");
        
        currentProduct = await response.json();
        renderProduct();
    } catch (err) {
        console.error(err);
        if (window.Toast) window.Toast.showError('Erro ao carregar produto', err.message);
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

function renderProduct() {
    if (!currentProduct) return;

    // Atualiza Textos
    document.getElementById('breadcrumb-current').textContent = currentProduct.nome;
    document.getElementById('product-title').textContent = currentProduct.nome;
    
    // Atualiza Categoria no Breadcrumb se disponível
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (breadcrumbCategory) {
        const catMap = {
            'Masculino': { name: 'Masculino', url: 'masculino.html' },
            'Feminino': { name: 'Feminino', url: 'feminino.html' },
            'Calçados': { name: 'Calçados', url: 'calcados.html' },
            'Calcados': { name: 'Calçados', url: 'calcados.html' },
            'Calcado': { name: 'Calçados', url: 'calcados.html' },
            'Equipamentos': { name: 'Equipamentos', url: 'equipamentos.html' },
            'Equipamento': { name: 'Equipamentos', url: 'equipamentos.html' }
        };

        // Fallback por ID caso a API ainda não retorne a propriedade categoria
        const idCategoryFallback = {
            1: 'Masculino', 2: 'Masculino', 4: 'Masculino', 5: 'Masculino',
            6: 'Feminino', 7: 'Feminino', 8: 'Feminino',
            3: 'Calçados', 9: 'Calçados', 10: 'Calçados',
            11: 'Equipamentos', 12: 'Equipamentos', 13: 'Equipamentos'
        };

        const prodId = currentProduct.id || currentProduct.Id;
        const categoriaKey = currentProduct.categoria
            || idCategoryFallback[prodId]
            || currentProduct.tipo;

        const catInfo = catMap[categoriaKey];
        if (catInfo) {
            breadcrumbCategory.textContent = catInfo.name;
            breadcrumbCategory.href = catInfo.url;
        }
    }

    // Atualiza Imagens da Galeria e Toast
    const prodImgUrl = getProductImageUrl(currentProduct);
    const mainGallery = document.getElementById('main-gallery-img');
    if (mainGallery) {
        mainGallery.style.backgroundImage = `url('${prodImgUrl}')`;
    }
    const galleryItems = document.querySelectorAll('.product-gallery .gallery-item:not(.large)');
    galleryItems.forEach(item => {
        item.style.backgroundImage = `url('${prodImgUrl}')`;
    });
    const toastImg = document.querySelector('.toast-img');
    if (toastImg) {
        toastImg.style.backgroundImage = `url('${prodImgUrl}')`;
    }
    
    // Formata o preço (ex: 490.0 => R$ 490,00)
    const formattedPrice = currentProduct.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('product-price').textContent = formattedPrice;
    
    document.getElementById('product-description').textContent = currentProduct.descricao;
    
    // Atualiza Toast infos base
    document.getElementById('toast-title').textContent = `1x ${currentProduct.nome}`;
    document.getElementById('toast-price').textContent = formattedPrice;

    // Monta seletor de cores baseadas nos estoques disponíveis
    const availableColors = [...new Set(currentProduct.estoques.map(e => e.cor))];
    const swatchesContainer = document.getElementById('color-swatches');
    swatchesContainer.innerHTML = '';

    availableColors.forEach((cor, index) => {
        const span = document.createElement('span');
        span.className = 'swatch';
        const hex = colorMap[cor.toLowerCase()] || '#ccc'; // fallback color
        span.style.background = hex;
        span.title = cor;
        
        span.addEventListener('click', () => {
            selectColor(cor);
        });

        swatchesContainer.appendChild(span);
        
        // Autoselecionar a primeira cor
        if (index === 0) {
            selectColor(cor);
        }
    });
}

function selectColor(colorName) {
    selectedColor = colorName;
    document.getElementById('color-label').innerHTML = `Cor: <strong>${colorName}</strong>`;
    
    // Atualiza classes visuais
    const swatches = document.querySelectorAll('.swatch');
    swatches.forEach(s => {
        if (s.title === colorName) s.classList.add('checked');
        else s.classList.remove('checked');
    });

    // Filtra tamanhos disponíveis para essa cor
    renderSizesForColor(colorName);
}

function renderSizesForColor(colorName) {
    const sizeGrid = document.getElementById('size-grid');
    sizeGrid.innerHTML = '';
    
    const estoques = currentProduct.estoques.filter(e => e.cor === colorName);
    selectedSize = null;
    selectedEstoqueId = null;

    if (estoques.length === 0) {
        sizeGrid.innerHTML = '<span>Esgotado nesta cor</span>';
        return;
    }

    estoques.forEach((estoque, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn-size';
        btn.textContent = estoque.tamanho;

        if (estoque.quantidade <= 0) {
            btn.classList.add('disabled');
            btn.disabled = true;
        } else {
            btn.addEventListener('click', () => {
                selectSize(estoque.tamanho, estoque.estoqueId, btn);
            });
            
            // Autoselecionar o primeiro tamanho disponível
            if (!selectedSize) {
                selectSize(estoque.tamanho, estoque.estoqueId, btn);
            }
        }

        sizeGrid.appendChild(btn);
    });
}

function selectSize(tamanho, estoqueId, btnElement) {
    selectedSize = tamanho;
    selectedEstoqueId = estoqueId;

    const buttons = document.querySelectorAll('.btn-size');
    buttons.forEach(b => b.classList.remove('selected'));
    
    if (btnElement) {
        btnElement.classList.add('selected');
    }
}

async function addToBag() {
    if (!selectedEstoqueId) {
        if (window.Toast) window.Toast.showWarning('Seleção incompleta', 'Por favor, selecione um tamanho e cor disponíveis.');
        return;
    }

    const btnElement = document.getElementById('btn-add-to-bag');
    let originalText = 'Adicionar ao Carrinho';
    if (btnElement) {
        originalText = btnElement.textContent;
        btnElement.disabled = true;
        btnElement.textContent = 'Adicionando...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/itens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify({
                estoqueId: selectedEstoqueId, 
                quantidade: 1
            })
        });

        if (!response.ok) {
            const erro = await response.json();
            if (window.Toast) window.Toast.showError('Erro ao adicionar ao carrinho', erro.message || 'Falha desconhecida.');
            return;
        }

        // Sucesso
        document.getElementById('toast-color').textContent = `Cor: ${selectedColor}`;
        const toastSizeSpan = document.getElementById('toast-size');
        if (toastSizeSpan) {
            toastSizeSpan.textContent = selectedSize;
        }
        
        const toast = document.getElementById('cart-toast');
        if (toast) {
            toast.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Erro de rede:', error);
        if (window.Toast) window.Toast.showError('Erro de conexão', 'Erro ao se conectar ao servidor.');
    } finally {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = originalText;
        }
    }
}

// Fecha o Toast
function closeToast() {
    const toast = document.getElementById('cart-toast');
    if (toast) {
        toast.classList.add('hidden');
    }
}