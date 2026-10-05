const API_BASE_URL = 'http://localhost:5205/api';
// Usaremos um usuário fixo 1 para fins de demonstração (o header que o backend espera)
const USUARIO_ID = 1;

document.addEventListener('DOMContentLoaded', async () => {
    await carregarCarrinho();

    // Event listener para o botão de checkout
    const btnCheckout = document.querySelector('.btn-checkout-black');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            window.location.href = 'checkout.html';
        });
    }
});

async function carregarCarrinho() {
    try {
        const response = await fetch(`${API_BASE_URL}/carrinho`, {
            headers: {
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        if (!response.ok) {
            console.error('Erro ao carregar o carrinho', await response.text());
            return;
        }

        const carrinho = await response.json();
        renderizarCarrinho(carrinho);
    } catch (error) {
        console.error('Erro de rede ao carregar carrinho:', error);
    }
}

function renderizarCarrinho(carrinho) {
    const container = document.querySelector('.cart-items-section');
    if (!container) return;

    // Limpar itens atuais (mantendo o header e footer)
    const items = container.querySelectorAll('.cart-item');
    items.forEach(item => item.remove());

    const header = container.querySelector('.cart-table-header');
    header.querySelector('.th-product').textContent = `Meu carrinho (${carrinho.quantidadeItens})`;

    if (!carrinho.itens || carrinho.itens.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'cart-item';
        emptyMsg.textContent = 'Seu carrinho está vazio.';
        header.after(emptyMsg);

        atualizarResumo(0);
        return;
    }

    let lastElement = header;

    carrinho.itens.forEach(item => {
        const article = document.createElement('article');
        article.className = 'cart-item';

        article.innerHTML = `
            <div class="item-details">
                <div class="item-img" style="background-color: #eee;"></div>
                <div class="item-info">
                    <h3>${item.nomeProduto}</h3>
                    <p>Tamanho: ${item.tamanho}, Cor: ${item.cor}</p>
                    <p>SKU: ${item.sku}</p>
                    ${!item.disponivel ? '<p style="color:red">Indisponível no estoque!</p>' : ''}
                </div>
            </div>
            
            <div class="item-qty">
                <div class="qty-selector">
                    <button class="btn-minus" onclick="atualizarQuantidade(${item.id}, ${item.quantidade - 1})">&minus;</button>
                    <input type="number" value="${item.quantidade}" min="1" readonly>
                    <button class="btn-plus" onclick="atualizarQuantidade(${item.id}, ${item.quantidade + 1})">&plus;</button>
                </div>
            </div>

            <div class="item-price-actions">
                <span class="price-tag">R$ ${item.subtotal.toFixed(2).replace('.', ',')}</span>
                <button class="btn-remove-text" onclick="removerItem(${item.id})">Remover</button>
            </div>
        `;

        lastElement.after(article);
        lastElement = article;
    });

    atualizarResumo(carrinho.subtotal);
}

function atualizarResumo(subtotal) {
    const subtotalEl = document.querySelector('.summary-details .summary-line:nth-child(1) span:nth-child(2)');
    const totalEl = document.querySelector('.summary-total span:nth-child(2)');

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (totalEl) totalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

async function atualizarQuantidade(itemId, novaQuantidade) {
    if (novaQuantidade < 1) return;

    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/itens/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify({ quantidade: novaQuantidade })
        });

        if (response.ok) {
            carregarCarrinho();
        } else {
            const err = await response.json();
            alert(`Erro: ${err.message}`);
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function removerItem(itemId) {
    if (!confirm('Deseja realmente remover este item do carrinho?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/itens/${itemId}`, {
            method: 'DELETE',
            headers: {
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        if (response.ok) {
            carregarCarrinho();
        } else {
            const err = await response.json();
            alert(`Erro: ${err.message}`);
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}
