const API_BASE_URL = 'http://localhost:5205/api';
// Usuário vindo da sessão/URL (usuario-session.js); sem login, redireciona para o login
const USUARIO_ID = exigirIdUsuario();

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
    if (window.LoadingService) window.LoadingService.show('Carregando carrinho...');
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/contexto`, {
            headers: {
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        if (!response.ok) {
            console.error('Erro ao carregar o contexto do carrinho', await response.text());
            return;
        }

        const contexto = await response.json();
        renderizarCarrinho(contexto);
    } catch (error) {
        console.error('Erro de rede ao carregar carrinho:', error);
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

function renderizarCarrinho(contexto) {
    const carrinho = contexto.carrinho || { itens: [], quantidadeItens: 0, subtotal: 0 };
    const valorFrete = contexto.valorFrete || 0;
    const valorTotal = contexto.valorTotal || carrinho.subtotal;
    const temEndereco = !!contexto.enderecoPrincipal;

    const container = document.querySelector('.cart-items-section');
    if (!container) return;

    const btnCheckout = document.querySelector('.btn-checkout-black');

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

        if (btnCheckout) {
            btnCheckout.disabled = true;
            btnCheckout.style.opacity = '0.5';
            btnCheckout.style.cursor = 'not-allowed';
        }

        renderizarResumoEstatico(0, 0, 0, false);
        return;
    }

    if (btnCheckout) {
        btnCheckout.disabled = false;
        btnCheckout.style.opacity = '1';
        btnCheckout.style.cursor = 'pointer';
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
                    <button class="btn-minus" id="btn-minus-${item.id}" onclick="alterarQuantidadeInput(${item.id}, ${item.quantidade - 1})">&minus;</button>
                    <input type="number" id="qty-${item.id}" value="${item.quantidade}" min="1" readonly>
                    <button class="btn-plus" id="btn-plus-${item.id}" onclick="alterarQuantidadeInput(${item.id}, ${item.quantidade + 1})">&plus;</button>
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

    renderizarResumoEstatico(carrinho.subtotal, valorFrete, valorTotal, temEndereco);
}

function renderizarResumoEstatico(subtotal, frete, total, temEndereco) {
    const subtotalEl = document.querySelector('.summary-details .summary-line:nth-child(1) span:nth-child(2)');
    const freteEl = document.querySelector('.summary-details .summary-line:nth-child(2) span:nth-child(2)');
    const totalEl = document.querySelector('.summary-total span:nth-child(2)');

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    if (subtotal <= 0) {
        if (freteEl) {
            freteEl.className = '';
            freteEl.textContent = 'R$ 0,00';
        }
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        return;
    }

    if (frete > 0) {
        if (freteEl) {
            freteEl.className = '';
            freteEl.textContent = `R$ ${frete.toFixed(2).replace('.', ',')}`;
        }
    } else {
        if (freteEl) {
            freteEl.className = '';
            freteEl.textContent = temEndereco ? 'R$ 0,00' : 'Calculado no checkout';
        }
    }
    
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

const qtyTimers = {};

function alterarQuantidadeInput(itemId, novaQuantidade) {
    if (novaQuantidade < 1) return;

    // Atualiza otimisticamente a UI
    const input = document.getElementById(`qty-${itemId}`);
    if (input) input.value = novaQuantidade;

    // Ajusta o onclick dos botões
    const btnMinus = document.getElementById(`btn-minus-${itemId}`);
    const btnPlus = document.getElementById(`btn-plus-${itemId}`);
    if (btnMinus) btnMinus.setAttribute('onclick', `alterarQuantidadeInput(${itemId}, ${novaQuantidade - 1})`);
    if (btnPlus) btnPlus.setAttribute('onclick', `alterarQuantidadeInput(${itemId}, ${novaQuantidade + 1})`);

    // Debounce
    if (qtyTimers[itemId]) clearTimeout(qtyTimers[itemId]);

    qtyTimers[itemId] = setTimeout(() => {
        atualizarQuantidadeAPI(itemId, novaQuantidade);
    }, 500);
}

async function atualizarQuantidadeAPI(itemId, novaQuantidade) {
    if (window.LoadingService) window.LoadingService.show('Atualizando quantidade...');
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
            await carregarCarrinho();
        } else {
            const err = await response.json();
            if (window.Toast) window.Toast.showError('Erro ao atualizar quantidade', err.message);
            else alert(`Erro: ${err.message}`);
            await carregarCarrinho(); // Retorna ao estado original do servidor em caso de erro
        }
    } catch (error) {
        console.error('Erro:', error);
        await carregarCarrinho();
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

async function removerItem(itemId) {
    if (window.LoadingService) window.LoadingService.show('Removendo item...');
    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/itens/${itemId}`, {
            method: 'DELETE',
            headers: {
                'X-Usuario-Id': USUARIO_ID.toString()
            }
        });

        if (response.ok) {
            await carregarCarrinho();
        } else {
            const err = await response.json();
            if (window.Toast) window.Toast.showError('Erro ao remover item', err.message);
            else alert(`Erro: ${err.message}`);
        }
    } catch (error) {
        console.error('Erro:', error);
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}
