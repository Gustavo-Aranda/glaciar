const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = exigirIdUsuario(); // Usuário da sessão/URL (usuario-session.js)

const $ = (id) => document.getElementById(id);
const formatarBRL = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

let subtotalCarrinho = 0;
let valorFrete = 0;
let valorDescontoTotal = 0;
let totalGeral = 0;
let estadoExistente = null;
let cartoesVinculados = [];
let cuponsAplicados = []; // Array de { id, codigo, valorDesconto, categoria }
let cupomFeedbackTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventosUI();
    await carregarContextoCheckout();

    $('checkout-form').addEventListener('submit', finalizarCompra);
});

/* ---------- 1. Carregamento Unificado (Contexto Agregado) ---------- */
async function carregarContextoCheckout() {
    if (window.LoadingService) window.LoadingService.show('Carregando dados do checkout...');
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/contexto`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Falha ao carregar dados do checkout.');
        }

        const contexto = await response.json();

        // 1. Dados do Carrinho e Frete inicial
        subtotalCarrinho = contexto.carrinho?.subtotal || 0;
        valorFrete = contexto.valorFrete || 0;

        // 2. Endereço Principal (define estadoExistente)
        renderizarEnderecoPrincipal(contexto.enderecoPrincipal);

        // 3. Renderiza itens e calcula totais reativos
        renderizarItensResumo(contexto.carrinho);
        atualizarTotaisCheckout();

        // 4. Cartões Vinculados
        cartoesVinculados = contexto.cartoes || [];
        renderizarCartoesVinculados(cartoesVinculados, totalGeral);

    } catch (error) {
        console.error('Erro ao inicializar contexto do checkout:', error);
        exibirMensagem(`Erro ao carregar dados: ${error.message}`, 'erro');
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

/* ---------- 2. Renderização dos Blocos da Tela ---------- */
function renderizarItensResumo(carrinho) {
    const itensContainer = $('resumo-itens');
    if (!itensContainer) return;

    const itens = carrinho?.itens || [];

    if (itens.length === 0) {
        itensContainer.innerHTML = '<p style="color: #666; font-size: 14px;">Seu carrinho está vazio.</p>';
        return;
    }

    itensContainer.innerHTML = itens.map(item => `
        <div class="product-item">
            <div class="product-img" style="background-color: #eee;"></div>
            <div class="product-details">
                <p class="product-name">${item.nomeProduto}</p>
                <p class="product-meta">SKU: ${item.sku} / ${item.cor} / ${item.tamanho}</p>
                <p class="product-meta">Qtd: ${item.quantidade}</p>
                <p class="product-price">${formatarBRL(item.subtotal)}</p>
            </div>
        </div>
    `).join('');
}

function renderizarResumo(carrinho, frete, total) {
    renderizarItensResumo(carrinho);
    atualizarTotaisCheckout();
}

/**
 * Recálculo reativo centralizado do checkout.
 * Respeita as regras de negócio de cupons (RN0033, RN0035, RN0036):
 * - Aplica 1º o promocional e depois cupons de troca
 * - Atualiza o campo 'Desconto' no resumo
 * - Sincroniza o saldo devedor restante com os inputs de pagamento
 */
function atualizarTotaisCheckout() {
    const baseTotal = subtotalCarrinho + valorFrete;

    const promo = cuponsAplicados.find(c => (c.categoria || '').toUpperCase() !== 'TROCA');
    const trocas = cuponsAplicados.filter(c => (c.categoria || '').toUpperCase() === 'TROCA');

    let saldo = baseTotal;
    let descontoCalculado = 0;

    if (promo) {
        const descPromo = Math.min(promo.valorDesconto, saldo);
        saldo -= descPromo;
        descontoCalculado += descPromo;
    }

    for (const t of trocas) {
        if (saldo > 0) {
            const descTroca = Math.min(t.valorDesconto, saldo);
            saldo -= descTroca;
            descontoCalculado += descTroca;
        }
    }

    valorDescontoTotal = descontoCalculado;
    totalGeral = Math.max(0, saldo);

    if ($('resumo-subtotal')) $('resumo-subtotal').textContent = formatarBRL(subtotalCarrinho);
    if ($('resumo-frete')) {
        $('resumo-frete').textContent = valorFrete > 0 ? formatarBRL(valorFrete) : (estadoExistente ? 'R$ 0,00' : 'Aguardando endereço');
    }

    const elDesconto = $('resumo-desconto');
    if (elDesconto) {
        if (valorDescontoTotal > 0) {
            elDesconto.textContent = `- ${formatarBRL(valorDescontoTotal)}`;
            elDesconto.classList.add('desconto-ativo');
        } else {
            elDesconto.textContent = 'R$ 0,00';
            elDesconto.classList.remove('desconto-ativo');
        }
    }

    if ($('resumo-total')) $('resumo-total').textContent = formatarBRL(totalGeral);

    // Mantém campo hidden de cupons sincronizado
    const hiddenCupons = $('cupons');
    if (hiddenCupons) {
        hiddenCupons.value = cuponsAplicados.map(c => c.codigo).join(',');
    }

    // Reajusta os cartões com o saldo restante
    sincronizarValorComCartoes(totalGeral);
}

function renderizarEnderecoPrincipal(enderecoPrincipal) {
    const infoDiv = $('endereco-info');
    const hiddenId = $('endereco-existente');

    if (!enderecoPrincipal) {
        infoDiv.innerHTML = `
            <strong>Nenhum endereço cadastrado</strong>
            <p>Cadastre um endereço para entrega no formulário abaixo.</p>
        `;
        hiddenId.value = '';
        estadoExistente = null;

        $('novo-endereco-form').classList.add('active');
        $('usar-novo').checked = true;
        $('usar-existente').checked = false;
        $('btn-toggle-endereco').textContent = '- Cancelar novo endereço';
        return;
    }

    const dadosFisicos = enderecoPrincipal.endereco || enderecoPrincipal;
    hiddenId.value = enderecoPrincipal.id;
    estadoExistente = dadosFisicos.estado;
    const apelidoStr = enderecoPrincipal.apelido ? ` (${enderecoPrincipal.apelido})` : '';

    infoDiv.innerHTML = `
        <strong>Endereço Principal${apelidoStr}</strong>
        <p>${dadosFisicos.logradouro}, ${dadosFisicos.numero}${dadosFisicos.complemento ? ' - ' + dadosFisicos.complemento : ''}, ${dadosFisicos.bairro} - ${dadosFisicos.cidade}/${dadosFisicos.estado}, CEP: ${dadosFisicos.cep}</p>
        <input type="hidden" id="endereco-existente" value="${enderecoPrincipal.id}">
    `;
}

function renderizarCartoesVinculados(cartoes, total) {
    const container = $('cartoes-vinculados-container');

    if (!cartoes || cartoes.length === 0) {
        container.innerHTML = `
            <div class="endereco-resumo-container" style="border: 1px dashed #ccc; background: #fff;">
                <p style="color: #666; font-size: 14px; margin: 0;">Nenhum cartão cadastrado na sua conta. Adicione um novo cartão abaixo.</p>
            </div>
        `;

        $('novo-cartao-form').classList.add('active');
        $('btn-toggle-cartao').textContent = '- Cancelar novo cartão';
        if (total > 0) {
            $('novo-cartao-valor').value = total.toFixed(2);
        } else {
            $('novo-cartao-valor').value = '0.00';
        }
        return;
    }

    container.innerHTML = '';
    cartoes.forEach((cartao, index) => {
        const article = document.createElement('div');
        article.className = 'endereco-resumo-container cartao-item-vinculado';
        article.setAttribute('data-cartao-id', cartao.id);

        const valorInicial = (index === 0 && total > 0) ? total.toFixed(2) : '0.00';
        const badgePadrao = cartao.padrao ? ' (Principal)' : '';
        const mesStr = String(cartao.mesValidade).padStart(2, '0');

        article.innerHTML = `
            <div class="endereco-resumo">
                <div class="endereco-info">
                    <div class="cartao-resumo-header">
                        <strong>Cartão vinculado${badgePadrao}</strong>
                        <span class="badge">${cartao.bandeira}</span>
                    </div>
                    <p>Final: **** ${cartao.ultimosDigitos} | Validade: ${mesStr}/${cartao.anoValidade}</p>
                    <div class="cartao-cobranca-box">
                        <label>Cobrar deste cartão (R$):</label>
                        <input type="number" step="0.01" min="0" class="input-valor-cartao"
                               data-cartao-id="${cartao.id}" value="${valorInicial}" placeholder="0.00">
                    </div>
                </div>
            </div>
        `;

        container.appendChild(article);
    });
}

/* ---------- 3. UI, Validação de Cupons e Recálculo Reativo ---------- */
function inicializarEventosUI() {
    // 1. Toggle Novo Endereço
    const btnEndereco = $('btn-toggle-endereco');
    const formNovoEndereco = $('novo-endereco-form');

    if (btnEndereco && formNovoEndereco) {
        btnEndereco.addEventListener('click', async () => {
            const ativo = formNovoEndereco.classList.toggle('active');
            $('usar-novo').checked = ativo;
            $('usar-existente').checked = !ativo;
            btnEndereco.textContent = ativo ? '- Cancelar novo endereço' : '+ Adicionar endereço';

            await recalcularFretePorOrigem();
        });
    }

    // 2. Mudança de Estado no formulário de novo endereço
    const selectEstado = $('estado');
    if (selectEstado) {
        selectEstado.addEventListener('change', async () => {
            if ($('usar-novo').checked) {
                await recalcularFretePorOrigem();
            }
        });
    }

    // 3. Toggle Novo Cartão
    const btnCartao = $('btn-toggle-cartao');
    const formNovoCartao = $('novo-cartao-form');

    if (btnCartao && formNovoCartao) {
        btnCartao.addEventListener('click', () => {
            const ativo = formNovoCartao.classList.toggle('active');
            btnCartao.textContent = ativo ? '- Cancelar novo cartão' : '+ Adicionar um cartão';

            const inputValorNovo = $('novo-cartao-valor');
            if (ativo && (!inputValorNovo.value || parseFloat(inputValorNovo.value) <= 0)) {
                const cobradoVinculados = somarValoresCartoesVinculados();
                const restante = Math.max(0, totalGeral - cobradoVinculados);
                if (restante > 0) {
                    inputValorNovo.value = restante.toFixed(2);
                }
            }
        });
    }

    // 4. Toggle e Ações de Cupom
    const btnToggleCupom = $('btn-toggle-cupom');
    const formCupom = $('cupom-form');
    if (btnToggleCupom && formCupom) {
        btnToggleCupom.addEventListener('click', () => {
            const ativo = formCupom.classList.toggle('active');
            const icon = btnToggleCupom.querySelector('.icon');
            if (icon) icon.textContent = ativo ? '-' : '+';
        });
    }

    // Botão da setinha para validar e aplicar o cupom
    const btnAplicarCupom = $('btn-aplicar-cupom');
    if (btnAplicarCupom) {
        btnAplicarCupom.addEventListener('click', aplicarCupom);
    }

    // Tecla Enter no input de cupom
    const inputCupom = $('cupom-codigo');
    if (inputCupom) {
        inputCupom.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                aplicarCupom();
            }
        });
    }

    // 5. Máscaras e validações para o novo cartão
    const inputNumero = $('cartao-numero');
    if (inputNumero) {
        inputNumero.addEventListener('input', (e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
            e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
        });
    }

    const inputMes = $('cartao-mes');
    if (inputMes) {
        inputMes.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '').slice(0, 2);
            if (val.length === 2 && parseInt(val, 10) > 12) val = '12';
            e.target.value = val;
        });
    }

    const inputAno = $('cartao-ano');
    if (inputAno) {
        inputAno.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }

    const inputCvv = $('cartao-cvv');
    if (inputCvv) {
        inputCvv.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    }
}

/* ---------- 4. Lógica de Cupons (Validação Reativa) ---------- */
async function aplicarCupom() {
    const input = $('cupom-codigo');
    if (!input) return;

    const codigo = input.value.trim().toUpperCase();
    if (!codigo) {
        mostrarFeedbackCupom('Por favor, informe o código do cupom.', 'erro');
        input.focus();
        return;
    }

    // Evita duplicidade do mesmo cupom
    if (cuponsAplicados.some(c => c.codigo.toUpperCase() === codigo)) {
        mostrarFeedbackCupom(`O cupom '${codigo}' já está adicionado ao pedido.`, 'alerta');
        return;
    }

    const btn = $('btn-aplicar-cupom');
    if (btn) btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/cupons/validar/${encodeURIComponent(codigo)}`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const msg = data.message || data.title || 'Cupom inválido ou não disponível.';
            mostrarFeedbackCupom(msg, 'erro');
            return;
        }

        const categoria = (data.categoria || '').toUpperCase();
        const ehTroca = categoria === 'TROCA';

        // RN0033: Apenas 1 cupom promocional por compra. Cupons de troca podem ser múltiplos.
        if (!ehTroca) {
            const promoExistente = cuponsAplicados.find(c => (c.categoria || '').toUpperCase() !== 'TROCA');
            if (promoExistente) {
                mostrarFeedbackCupom(
                    `Apenas 1 cupom promocional é permitido por compra. Remova '${promoExistente.codigo}' se desejar substituí-lo.`,
                    'alerta'
                );
                return;
            }
        }

        // Adiciona à lista de cupons aplicados no checkout
        cuponsAplicados.push({
            id: data.id,
            codigo: data.codigo,
            valorDesconto: Number(data.valorDesconto),
            categoria: data.categoria
        });

        input.value = '';
        mostrarFeedbackCupom(`Cupom '${data.codigo}' aplicado com sucesso!`, 'sucesso');
        renderizarCuponsAplicados();
        atualizarTotaisCheckout();

        if (window.Toast && typeof window.Toast.showSuccess === 'function') {
            window.Toast.showSuccess('Cupom Aplicado', `Desconto de ${formatarBRL(data.valorDesconto)} adicionado.`);
        }
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        mostrarFeedbackCupom('Erro ao validar o cupom. Verifique sua conexão.', 'erro');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function removerCupom(codigo) {
    const idx = cuponsAplicados.findIndex(c => c.codigo.toUpperCase() === codigo.toUpperCase());
    if (idx !== -1) {
        const removido = cuponsAplicados.splice(idx, 1)[0];
        renderizarCuponsAplicados();
        atualizarTotaisCheckout();
        mostrarFeedbackCupom(`Cupom '${removido.codigo}' removido.`, 'info');
        if (window.Toast && typeof window.Toast.showInfo === 'function') {
            window.Toast.showInfo('Cupom Removido', `O cupom '${removido.codigo}' foi removido do pedido.`);
        }
    }
}

function renderizarCuponsAplicados() {
    const container = $('cupons-aplicados-container');
    if (!container) return;

    if (cuponsAplicados.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = cuponsAplicados.map(c => {
        const ehTroca = (c.categoria || '').toUpperCase() === 'TROCA';
        const badgeLabel = ehTroca ? 'Troca' : 'Promocional';
        const badgeClass = ehTroca ? 'badge-troca' : 'badge-promo';

        return `
            <div class="cupom-tag-card" data-codigo="${c.codigo}">
                <div class="cupom-tag-info">
                    <span class="cupom-tag-codigo">${c.codigo}</span>
                    <span class="cupom-tag-badge ${badgeClass}">${badgeLabel}</span>
                    <span class="cupom-tag-valor">-${formatarBRL(c.valorDesconto)}</span>
                </div>
                <button type="button" class="btn-remover-cupom" data-codigo="${c.codigo}" title="Remover cupom ${c.codigo}" aria-label="Remover cupom">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-remover-cupom').forEach(btn => {
        btn.addEventListener('click', () => {
            const cod = btn.getAttribute('data-codigo');
            if (cod) removerCupom(cod);
        });
    });
}

function mostrarFeedbackCupom(msg, tipo) {
    const el = $('cupom-mensagem-feedback');
    if (!el) return;

    el.textContent = msg;
    el.className = `cupom-feedback-msg cupom-feedback-${tipo}`;
    el.style.display = 'block';

    if (cupomFeedbackTimeout) {
        clearTimeout(cupomFeedbackTimeout);
    }
    cupomFeedbackTimeout = setTimeout(() => {
        el.style.display = 'none';
    }, 4000);
}

/* ---------- 5. Recálculo Reativo de Frete ---------- */
async function recalcularFretePorOrigem() {
    const tipo = document.querySelector('input[name="endereco_tipo"]:checked')?.value || 'existente';
    const estado = (tipo === 'existente') ? estadoExistente : ($('estado')?.value || null);

    if (!estado || subtotalCarrinho <= 0) {
        valorFrete = 0;
        atualizarTotaisCheckout();
        return;
    }

    if (window.LoadingService) window.LoadingService.show('Calculando frete...');
    if ($('resumo-frete')) $('resumo-frete').textContent = 'Calculando...';

    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/frete/${estado}`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });

        if (!response.ok) throw new Error('Não foi possível calcular o frete.');

        const freteData = await response.json();
        valorFrete = freteData.valor || 0;
        atualizarTotaisCheckout();
    } catch (err) {
        console.error('Erro ao recalcular frete:', err);
        valorFrete = 0;
        atualizarTotaisCheckout();
        if ($('resumo-frete')) $('resumo-frete').textContent = 'Erro ao calcular';
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

function sincronizarValorComCartoes(total) {
    const inputsVinculados = document.querySelectorAll('.input-valor-cartao');
    const inputNovo = $('novo-cartao-valor');

    // Se o valor restante for R$ 0,00 (100% coberto por cupons)
    if (total <= 0) {
        inputsVinculados.forEach(inp => inp.value = '0.00');
        if (inputNovo) inputNovo.value = '0.00';
        return;
    }

    if (inputsVinculados.length > 0) {
        if (inputsVinculados.length === 1) {
            inputsVinculados[0].value = total.toFixed(2);
        } else {
            let outrosComValor = false;
            for (let i = 1; i < inputsVinculados.length; i++) {
                const val = parseFloat(inputsVinculados[i].value);
                if (!isNaN(val) && val > 0) {
                    outrosComValor = true;
                    break;
                }
            }
            if (!outrosComValor) {
                inputsVinculados[0].value = total.toFixed(2);
            }
        }
    } else {
        if (inputNovo) {
            inputNovo.value = total.toFixed(2);
        }
    }
}

function somarValoresCartoesVinculados() {
    let total = 0;
    document.querySelectorAll('.input-valor-cartao').forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) total += val;
    });
    return total;
}

/* ---------- 6. Coleta de Dados ---------- */
function coletarEndereco() {
    const tipo = document.querySelector('input[name="endereco_tipo"]:checked')?.value || 'existente';

    if (tipo === 'existente') {
        const idExistente = $('endereco-existente') ? parseInt($('endereco-existente').value, 10) : null;
        return {
            usuarioEnderecoId: (idExistente && !isNaN(idExistente)) ? idExistente : null,
            novoEndereco: null
        };
    }

    return {
        usuarioEnderecoId: null,
        novoEndereco: {
            cep: $('cep').value.trim(),
            logradouro: $('logradouro').value.trim(),
            numero: $('numero').value.trim(),
            bairro: $('bairro').value.trim(),
            cidade: $('cidade').value.trim(),
            estado: $('estado').value,
            salvarNoPerfil: $('salvar-perfil').checked,
            apelido: $('apelido').value.trim()
        }
    };
}

function coletarCupons() {
    return cuponsAplicados.map(c => c.codigo);
}

function coletarCartoes() {
    // Se o pedido foi 100% quitado por cupons, não há cobrança em cartões
    if (totalGeral <= 0) {
        return [];
    }

    const cartoes = [];

    // 1. Cartões vinculados com valor > 0
    document.querySelectorAll('.input-valor-cartao').forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
            cartoes.push({
                usuarioCartaoId: parseInt(input.getAttribute('data-cartao-id'), 10),
                novoCartao: null,
                valor: val
            });
        }
    });

    // 2. Novo cartão (se preenchido e com valor > 0)
    const valorNovo = parseFloat($('novo-cartao-valor')?.value);
    const numeroNovo = ($('cartao-numero')?.value || '').replace(/\s+/g, '');
    const mesNovo = parseInt($('cartao-mes')?.value?.trim(), 10);
    const anoRaw = parseInt($('cartao-ano')?.value?.trim(), 10);
    const anoNovo = !isNaN(anoRaw) ? (anoRaw < 100 ? 2000 + anoRaw : anoRaw) : NaN;
    const cvvNovo = ($('cartao-cvv')?.value || '').trim();
    const bandeiraNova = $('cartao-bandeira')?.value || '';
    const salvarNoPerfil = $('save-card')?.checked || false;

    if (!isNaN(valorNovo) && valorNovo > 0 && (numeroNovo || !isNaN(mesNovo) || !isNaN(anoNovo) || cvvNovo)) {
        cartoes.push({
            usuarioCartaoId: null,
            novoCartao: {
                numero: numeroNovo,
                cvv: cvvNovo,
                bandeira: bandeiraNova,
                mesValidade: mesNovo,
                anoValidade: anoNovo,
                salvarNoPerfil: salvarNoPerfil
            },
            valor: valorNovo
        });
    }

    return cartoes;
}

function validar(payload) {
    if (!payload.usuarioEnderecoId && !payload.novoEndereco) {
        return 'Selecione ou cadastre um endereço de entrega.';
    }

    const e = payload.novoEndereco;
    if (e) {
        if (!e.cep || !e.logradouro || !e.numero || !e.bairro || !e.cidade || !e.estado) {
            return 'Preencha todos os campos obrigatórios do novo endereço.';
        }
    }

    // Validação quando o valor restante é nulo ou R$ 0,00 (100% coberto por cupons)
    if (totalGeral <= 0) {
        // Valida se há pelo menos um cupom aplicado no pedido
        if (!payload.codigosCupons || payload.codigosCupons.length === 0 || cuponsAplicados.length === 0) {
            return 'Para compras com valor zerado (R$ 0,00), é necessário que um cupom válido esteja aplicado ao pedido.';
        }

        // Valida se o cupom está realmente vinculado aos cupons validados
        const cupomNoPedido = cuponsAplicados.some(c => payload.codigosCupons.includes(c.codigo));
        if (!cupomNoPedido) {
            return 'O cupom informado não foi validado no pedido. Aplique o cupom novamente.';
        }

        // Cupom validado no pedido: não cobra nada no cartão e deixa passar a compra normalmente
        payload.cartoes = [];
        return null;
    }

    // Se o pedido tiver saldo a ser pago por cartões (> 0)
    if (!payload.cartoes || payload.cartoes.length === 0) {
        return 'Informe o valor a ser cobrado em pelo menos um cartão.';
    }

    const houveCupom = cuponsAplicados.length > 0;
    for (const c of payload.cartoes) {
        // RN0034 / RN0035: Se combinou cupons e o saldo restante for inferior a R$ 10,00, é permitido valor menor que R$ 10,00
        const permiteMenorQue10 = houveCupom && totalGeral < 10;
        if (!permiteMenorQue10 && c.valor < 10) {
            return 'O valor mínimo por cartão de crédito é R$ 10,00.';
        }
        if (c.novoCartao) {
            const nc = c.novoCartao;
            if (!nc.numero || nc.numero.length < 13 || nc.numero.length > 19) {
                return 'Informe um número de cartão de crédito válido (13 a 19 dígitos).';
            }
            if (!nc.bandeira) {
                return 'Selecione a bandeira do cartão.';
            }
            if (!Number.isInteger(nc.mesValidade) || nc.mesValidade < 1 || nc.mesValidade > 12) {
                return 'Informe um mês de validade válido (1 a 12).';
            }
            const anoAtual = new Date().getFullYear();
            if (!Number.isInteger(nc.anoValidade) || nc.anoValidade < anoAtual || nc.anoValidade > 2100) {
                return `Informe um ano de validade válido (a partir de ${anoAtual}).`;
            }
            const mesAtual = new Date().getMonth() + 1;
            if (nc.anoValidade === anoAtual && nc.mesValidade < mesAtual) {
                return 'O cartão informado está vencido.';
            }
            if (!nc.cvv || nc.cvv.length < 3 || nc.cvv.length > 4) {
                return 'Informe um código de segurança (CVV) válido (3 ou 4 dígitos).';
            }
        }
    }

    const totalCobrado = payload.cartoes.reduce((acc, c) => acc + c.valor, 0);
    if (totalCobrado < totalGeral) {
        return `O total nos cartões (${formatarBRL(totalCobrado)}) é inferior ao valor restante do pedido (${formatarBRL(totalGeral)}).`;
    }

    return null;
}

/* ---------- 7. Submissão do Pedido ---------- */
async function finalizarCompra(e) {
    e.preventDefault();

    const btn = document.querySelector('.btn-submit');
    if (btn.disabled) return;

    // Aviso se digitou um cupom no campo mas não clicou na setinha para validar
    const cupomNaoAplicado = $('cupom-codigo')?.value.trim();
    if (cupomNaoAplicado) {
        const jaFoi = cuponsAplicados.some(c => c.codigo.toUpperCase() === cupomNaoAplicado.toUpperCase());
        if (!jaFoi) {
            window.Toast?.showError(
                'Cupom não aplicado',
                `Você digitou '${cupomNaoAplicado}' mas não clicou na setinha para validá-lo. Clique na seta ao lado do campo para aplicar o cupom antes de finalizar.`
            );
            return;
        }
    }

    const payload = {
        ...coletarEndereco(),
        codigosCupons: coletarCupons(),
        cartoes: coletarCartoes()
    };

    const erroValidacao = validar(payload);
    if (erroValidacao) {
        window.Toast.showError('Erro de Validação', erroValidacao);
        return;
    }

    if (window.LoadingService) window.LoadingService.show('Processando seu pedido...');
    btn.disabled = true;
    btn.textContent = 'Processando...';
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/finalizar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Usuario-Id': USUARIO_ID.toString()
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const msg = response.status >= 500
                ? 'Erro interno no servidor. Tente novamente em instantes.'
                : (data.message || data.title || data.erro || 'Falha ao finalizar compra.');
            if (data.details) console.error('Detalhes do erro:', data.details);
            throw new Error(msg);
        }

        // Sucesso
        const mensagemSucesso = `
            <div style="padding: 2rem; text-align: center; color: #2e8b57;">
                <h2>Compra finalizada com sucesso! 🎉</h2>
                <p><strong>Código:</strong> ${data.codigo}</p>
                <p><strong>Subtotal:</strong> ${formatarBRL(data.subtotal)}</p>
                <p><strong>Frete:</strong> ${formatarBRL(data.valorFrete)}</p>
                ${data.valorAbatidoCupons > 0 ? `<p><strong>Desconto Aplicado:</strong> -${formatarBRL(data.valorAbatidoCupons)}</p>` : ''}
                <p><strong>Valor Final:</strong> ${formatarBRL(data.valorTotal)}</p>
                ${data.cupomTrocaGerado ? `
                    <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border: 1px dashed #2e7d32; border-radius: 6px; color: #1b5e20;">
                        <strong>Novo Cupom de Troca Gerado!</strong>
                        <p>Código: <b>${data.cupomTrocaGerado.codigo}</b> | Saldo: <b>${formatarBRL(data.cupomTrocaGerado.valorDesconto)}</b></p>
                    </div>
                ` : ''}
                <br>
                <a href="pedidos.html" class="btn-submit" style="display:inline-block; margin-top: 1rem; text-decoration: none;">Ver meus pedidos</a>
            </div>
        `;
        document.querySelector('.checkout-main').innerHTML = mensagemSucesso;

    } catch (error) {
        const msg = error instanceof TypeError ? 'Erro de rede. Verifique sua conexão.' : error.message;
        window.Toast.showError('Falha no Pagamento', msg);
        btn.disabled = false;
        btn.textContent = 'Finalizar Compra';
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

/* ---------- Feedback Opcional para Mensagens Locais (Não Toast) ---------- */
function exibirMensagem(texto, tipo, html = false) {
    if (tipo === 'erro') {
        window.Toast.showError('Erro', texto);
        return;
    }
    
    const div = $('mensagem');
    if (!div) return;
    
    div.style.display = 'block';
    const cores = { erro: 'red', sucesso: 'green', info: 'blue' };
    div.style.color = cores[tipo];
    div.style.padding = '1rem';
    div.style.marginBottom = '1rem';
    div.style.border = `1px solid ${cores[tipo]}`;
    
    if (html) div.innerHTML = texto; else div.textContent = texto;
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
