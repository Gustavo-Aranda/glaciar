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

    atualizarResumo(carrinho.subtotal, carrinho.quantidadeItens);
}

async function atualizarResumo(subtotal, quantidadeItens = 0) {
    const subtotalEl = document.querySelector('.summary-details .summary-line:nth-child(1) span:nth-child(2)');
    const freteEl = document.querySelector('.summary-details .summary-line:nth-child(2) span:nth-child(2)');
    const totalEl = document.querySelector('.summary-total span:nth-child(2)');

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    if (subtotal <= 0 || quantidadeItens <= 0) {
        if (freteEl) {
            freteEl.className = '';
            freteEl.textContent = 'R$ 0,00';
        }
        if (totalEl) totalEl.textContent = 'R$ 0,00';
        return;
    }

    // Tenta obter o frete estimado para o endereço principal cadastrado
    let valorFrete = null;
    try {
        const resEnd = await fetch(`${API_BASE_URL}/enderecos/cliente/${USUARIO_ID}`);
        if (resEnd.ok) {
            const enderecos = await resEnd.json();
            const principal = enderecos.find(e => e.padrao) || enderecos[0];
            const dadosFisicos = principal?.endereco || principal;
            const estado = dadosFisicos?.estado;

            if (estado) {
                const resFrete = await fetch(`${API_BASE_URL}/carrinho/frete/${estado}`, {
                    headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
                });
                if (resFrete.ok) {
                    const freteData = await resFrete.json();
                    valorFrete = freteData.valor;
                }
            }
        }
    } catch (e) {
        console.warn('Não foi possível estimar o frete no carrinho:', e);
    }

    if (valorFrete !== null) {
        if (freteEl) {
            freteEl.className = '';
            freteEl.textContent = `R$ ${valorFrete.toFixed(2).replace('.', ',')}`;
        }
        const total = subtotal + valorFrete;
        if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    } else {
        if (freteEl) {
            freteEl.className = '';
            freteEl.textContent = 'Calculado no checkout';
        }
        if (totalEl) totalEl.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }
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
            carregarCarrinho(); // Retorna ao estado original do servidor em caso de erro
        }
    } catch (error) {
        console.error('Erro:', error);
        carregarCarrinho();
    }
}

async function removerItem(itemId) {

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
