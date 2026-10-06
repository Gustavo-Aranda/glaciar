const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = exigirIdUsuario(); // Usuário da sessão/URL (usuario-session.js)

const $ = (id) => document.getElementById(id);
const formatarBRL = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

let subtotalCarrinho = 0;
let valorFrete = 0;
let totalGeral = 0;
let estadoExistente = null;
let cartoesVinculados = [];

document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventosUI();
    await carregarContextoCheckout();

    $('checkout-form').addEventListener('submit', finalizarCompra);
});

/* ---------- 1. Carregamento Unificado (Contexto Agregado) ---------- */
async function carregarContextoCheckout() {
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/contexto`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Falha ao carregar dados do checkout.');
        }

        const contexto = await response.json();

        // 1. Dados do Carrinho e Totais
        subtotalCarrinho = contexto.carrinho?.subtotal || 0;
        valorFrete = contexto.valorFrete || 0;
        totalGeral = contexto.valorTotal || subtotalCarrinho;

        renderizarResumo(contexto.carrinho, valorFrete, totalGeral);

        // 2. Endereço Principal
        renderizarEnderecoPrincipal(contexto.enderecoPrincipal);

        // 3. Cartões Vinculados
        cartoesVinculados = contexto.cartoes || [];
        renderizarCartoesVinculados(cartoesVinculados, totalGeral);

    } catch (error) {
        console.error('Erro ao inicializar contexto do checkout:', error);
        exibirMensagem(`Erro ao carregar dados: ${error.message}`, 'erro');
    }
}

/* ---------- 2. Renderização dos Blocos da Tela ---------- */
function renderizarResumo(carrinho, frete, total) {
    $('resumo-subtotal').textContent = formatarBRL(carrinho?.subtotal || 0);
    $('resumo-frete').textContent = frete > 0 ? formatarBRL(frete) : (estadoExistente ? 'R$ 0,00' : 'Aguardando endereço');
    $('resumo-total').textContent = formatarBRL(total);

    const itensContainer = $('resumo-itens');
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

        // Abre automaticamente o formulário de novo endereço
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

        // Abre automaticamente o formulário de novo cartão com o total preenchido
        $('novo-cartao-form').classList.add('active');
        $('btn-toggle-cartao').textContent = '- Cancelar novo cartão';
        if (total > 0) {
            $('novo-cartao-valor').value = total.toFixed(2);
        }
        return;
    }

    container.innerHTML = '';
    cartoes.forEach((cartao, index) => {
        const article = document.createElement('div');
        article.className = 'endereco-resumo-container cartao-item-vinculado';
        article.setAttribute('data-cartao-id', cartao.id);

        // O primeiro cartão (ou padrão) assume o total inicial
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

/* ---------- 3. UI e Recálculo Reativo de Frete ---------- */
function inicializarEventosUI() {
    // 1. Toggle Novo Endereço
    const btnEndereco = $('btn-toggle-endereco');
    const formNovoEndereco = $('novo-endereco-form');

    btnEndereco.addEventListener('click', async () => {
        const ativo = formNovoEndereco.classList.toggle('active');
        $('usar-novo').checked = ativo;
        $('usar-existente').checked = !ativo;
        btnEndereco.textContent = ativo ? '- Cancelar novo endereço' : '+ Adicionar endereço';

        await recalcularFretePorOrigem();
    });

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

    // 4. Toggle Cupons
    $('btn-toggle-cupom').addEventListener('click', () => {
        $('cupom-form').classList.toggle('active');
    });

    // 5. Máscaras e validações em tempo real para o novo cartão
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

async function recalcularFretePorOrigem() {
    const tipo = document.querySelector('input[name="endereco_tipo"]:checked')?.value || 'existente';
    const estado = (tipo === 'existente') ? estadoExistente : ($('estado')?.value || null);

    if (!estado || subtotalCarrinho <= 0) {
        valorFrete = 0;
        totalGeral = subtotalCarrinho;
        $('resumo-frete').textContent = estado ? 'R$ 0,00' : 'Aguardando endereço';
        $('resumo-total').textContent = formatarBRL(totalGeral);
        sincronizarValorComCartoes(totalGeral);
        return;
    }

    $('resumo-frete').textContent = 'Calculando...';

    try {
        const response = await fetch(`${API_BASE_URL}/carrinho/frete/${estado}`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });

        if (!response.ok) throw new Error('Não foi possível calcular o frete.');

        const freteData = await response.json();
        valorFrete = freteData.valor || 0;
        totalGeral = subtotalCarrinho + valorFrete;

        $('resumo-frete').textContent = formatarBRL(valorFrete);
        $('resumo-total').textContent = formatarBRL(totalGeral);
        sincronizarValorComCartoes(totalGeral);
    } catch (err) {
        console.error('Erro ao recalcular frete:', err);
        valorFrete = 0;
        totalGeral = subtotalCarrinho;
        $('resumo-frete').textContent = 'Erro ao calcular';
        $('resumo-total').textContent = formatarBRL(totalGeral);
        sincronizarValorComCartoes(totalGeral);
    }
}

function sincronizarValorComCartoes(total) {
    if (total <= 0) return;

    const inputsVinculados = document.querySelectorAll('.input-valor-cartao');
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
        const inputNovo = $('novo-cartao-valor');
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

/* ---------- 4. Coleta de Dados ---------- */
function coletarEndereco() {
    const tipo = document.querySelector('input[name="endereco_tipo"]:checked').value;

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
    return $('cupons').value.split(',').map(c => c.trim()).filter(Boolean);
}

function coletarCartoes() {
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

    if (!payload.cartoes || payload.cartoes.length === 0) {
        return 'Informe o valor a ser cobrado em pelo menos um cartão.';
    }

    for (const c of payload.cartoes) {
        if (c.valor < 10) {
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
        return `O total nos cartões (${formatarBRL(totalCobrado)}) é inferior ao valor do pedido com frete (${formatarBRL(totalGeral)}).`;
    }

    return null;
}

/* ---------- 5. Submissão do Pedido ---------- */
async function finalizarCompra(e) {
    e.preventDefault();

    const btn = document.querySelector('.btn-submit');
    if (btn.disabled) return;

    const payload = {
        ...coletarEndereco(),
        codigosCupons: coletarCupons(),
        cartoes: coletarCartoes()
    };

    const erroValidacao = validar(payload);
    if (erroValidacao) {
        exibirMensagem(erroValidacao, 'erro');
        return;
    }

    definirCarregando(btn, true);
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

        exibirMensagem(
            `Compra finalizada com sucesso!<br><strong>Código:</strong> ${data.codigo}<br>` +
            `<strong>Subtotal:</strong> ${formatarBRL(data.subtotal)}<br>` +
            `<strong>Frete:</strong> ${formatarBRL(data.valorFrete)}<br>` +
            `<strong>Total:</strong> ${formatarBRL(data.valorTotal)}`, 'sucesso', true);
        btn.textContent = 'Compra concluída';
    } catch (error) {
        const msg = error instanceof TypeError ? 'Erro de rede. Verifique sua conexão.' : error.message;
        exibirMensagem(msg, 'erro');
        definirCarregando(btn, false);
    }
}

/* ---------- Feedback ---------- */
function definirCarregando(btn, carregando) {
    btn.disabled = carregando;
    btn.textContent = carregando ? 'Processando...' : 'Finalizar Compra';
    if (carregando) exibirMensagem('Processando seu pedido...', 'info');
}

function exibirMensagem(texto, tipo, html = false) {
    const div = $('mensagem');
    if (div) div.style.display = 'none';

    if (tipo === 'erro') {
        window.Toast.showError('Erro', texto);
    } else if (tipo === 'sucesso') {
        window.Toast.showSuccess('Sucesso', texto);
    } else {
        window.Toast.showSuccess('Informação', texto);
    }
}
