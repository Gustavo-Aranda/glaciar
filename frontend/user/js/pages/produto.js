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

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const produtoId = urlParams.get('produto');

    if (!produtoId) {
        if (window.Toast) window.Toast.showError('Erro', 'Produto não especificado.');
        else alert("Produto não especificado.");
        window.location.href = "index.html";
        return;
    }

    await loadProductData(produtoId);

    document.getElementById('btn-add-to-bag').addEventListener('click', addToBag);
});

async function loadProductData(produtoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/produtos/${produtoId}`);
        if (!response.ok) throw new Error("Produto não encontrado");
        
        currentProduct = await response.json();
        renderProduct();
    } catch (err) {
        console.error(err);
        if (window.Toast) window.Toast.showError('Erro ao carregar produto', err.message);
        else alert(err.message);
    }
}

function renderProduct() {
    if (!currentProduct) return;

    // Atualiza Textos
    document.getElementById('breadcrumb-current').textContent = currentProduct.nome;
    document.getElementById('product-title').textContent = currentProduct.nome;
    
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
        if (window.Toast) window.Toast.showError('Seleção incompleta', 'Por favor, selecione um tamanho e cor disponíveis.');
        else alert("Por favor, selecione um tamanho e cor disponíveis.");
        return;
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
            else alert('Erro ao adicionar ao carrinho: ' + (erro.message || 'Falha desconhecida.'));
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
        else alert('Erro ao se conectar ao servidor.');
    }
}

// Fecha o Toast
function closeToast() {
    const toast = document.getElementById('cart-toast');
    if (toast) {
        toast.classList.add('hidden');
    }
}