const API_BASE_URL = 'http://localhost:5205/api';
const USUARIO_ID = exigirIdUsuario(); // Usuário da sessão/URL (usuario-session.js)

const $ = (id) => document.getElementById(id);
const formatarBRL = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

let subtotalCarrinho = 0;
let cartoesVinculados = [];

document.addEventListener('DOMContentLoaded', async () => {
    inicializarUI();
    await carregarResumo();
    await carregarEnderecoPrincipal();
    await carregarCartoesVinculados();

    $('checkout-form').addEventListener('submit', finalizarCompra);
});

/* ---------- UI (toggles de formulários) ---------- */
function inicializarUI() {
    // 1. Toggle Novo Endereço
    const btnEndereco = $('btn-toggle-endereco');
    const formNovoEndereco = $('novo-endereco-form');

    btnEndereco.addEventListener('click', () => {
        const ativo = formNovoEndereco.classList.toggle('active');
        $('usar-novo').checked = ativo;
        $('usar-existente').checked = !ativo;
        btnEndereco.textContent = ativo ? '- Cancelar novo endereço' : '+ Adicionar endereço';
    });

    // 2. Toggle Novo Cartão (recluso por padrão)
    const btnCartao = $('btn-toggle-cartao');
    const formNovoCartao = $('novo-cartao-form');

    btnCartao.addEventListener('click', () => {
        const ativo = formNovoCartao.classList.toggle('active');
        btnCartao.textContent = ativo ? '- Cancelar novo cartão' : '+ Adicionar um cartão';

        // Se abriu e nenhum valor foi colocado, sugere o restante a pagar
        const inputValorNovo = $('novo-cartao-valor');
        if (ativo && (!inputValorNovo.value || parseFloat(inputValorNovo.value) <= 0)) {
            const cobradoVinculados = somarValoresCartoesVinculados();
            const restante = Math.max(0, subtotalCarrinho - cobradoVinculados);
            if (restante > 0) {
                inputValorNovo.value = restante.toFixed(2);
            }
        }
    });

    // 3. Toggle Cupons
    $('btn-toggle-cupom').addEventListener('click', () => {
        $('cupom-form').classList.toggle('active');
    });
}

/* ---------- 1. Carregar Endereço Principal ---------- */
async function carregarEnderecoPrincipal() {
    const infoDiv = $('endereco-info');
    const hiddenId = $('endereco-existente');

    try {
        const response = await fetch(`${API_BASE_URL}/enderecos/cliente/${USUARIO_ID}`);
        if (!response.ok) throw new Error('Falha ao consultar endereços do cliente.');

        const enderecos = await response.json();

        if (!enderecos || enderecos.length === 0) {
            infoDiv.innerHTML = `
                <strong>Nenhum endereço cadastrado</strong>
                <p>Cadastre um endereço para entrega no formulário abaixo.</p>
            `;
            hiddenId.value = '';

            // Expande o formulário de novo endereço automaticamente
            const formNovo = $('novo-endereco-form');
            formNovo.classList.add('active');
            $('usar-novo').checked = true;
            $('usar-existente').checked = false;
            $('btn-toggle-endereco').textContent = '- Cancelar novo endereço';
            return;
        }

        // Seleciona o endereço principal (padrão) ou o primeiro cadastrado
        const enderecoPrincipal = enderecos.find(e => e.padrao) || enderecos[0];
        const dadosFisicos = enderecoPrincipal.endereco || enderecoPrincipal;

        hiddenId.value = enderecoPrincipal.id;
        const apelidoStr = enderecoPrincipal.apelido ? ` (${enderecoPrincipal.apelido})` : '';

        infoDiv.innerHTML = `
            <strong>Endereço Principal${apelidoStr}</strong>
            <p>${dadosFisicos.logradouro}, ${dadosFisicos.numero}${dadosFisicos.complemento ? ' - ' + dadosFisicos.complemento : ''}, ${dadosFisicos.bairro} - ${dadosFisicos.cidade}/${dadosFisicos.estado}, CEP: ${dadosFisicos.cep}</p>
            <input type="hidden" id="endereco-existente" value="${enderecoPrincipal.id}">
        `;
    } catch (err) {
        console.error('Erro ao buscar endereço principal:', err);
        infoDiv.innerHTML = `
            <strong style="color: red;">Erro ao carregar endereço principal</strong>
            <p>Utilize a opção de adicionar novo endereço abaixo.</p>
        `;
        hiddenId.value = '';
    }
}

/* ---------- 2. Carregar Cartões Vinculados (empilhados) ---------- */
async function carregarCartoesVinculados() {
    const container = $('cartoes-vinculados-container');
    container.innerHTML = '<p style="color: #666; font-size: 14px;">Carregando cartões vinculados...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/cartoes/cliente/${USUARIO_ID}`);
        if (!response.ok) throw new Error('Falha ao consultar cartões vinculados.');

        cartoesVinculados = await response.json();

        if (!cartoesVinculados || cartoesVinculados.length === 0) {
            container.innerHTML = `
                <div class="endereco-resumo-container" style="border: 1px dashed #ccc; background: #fff;">
                    <p style="color: #666; font-size: 14px; margin: 0;">Nenhum cartão cadastrado na sua conta. Adicione um novo cartão abaixo.</p>
                </div>
            `;

            // Abre o formulário de novo cartão automaticamente e define valor total
            $('novo-cartao-form').classList.add('active');
            $('btn-toggle-cartao').textContent = '- Cancelar novo cartão';
            if (subtotalCarrinho > 0) {
                $('novo-cartao-valor').value = subtotalCarrinho.toFixed(2);
            }
            return;
        }

        // Renderiza cada cartão em estilo 'Endereço Principal', empilhados
        container.innerHTML = '';
        cartoesVinculados.forEach((cartao, index) => {
            const article = document.createElement('div');
            article.className = 'endereco-resumo-container cartao-item-vinculado';
            article.setAttribute('data-cartao-id', cartao.id);

            // Se for o único ou o primeiro/padrão, recebe o valor total inicial da compra
            const valorInicial = (index === 0 && subtotalCarrinho > 0) ? subtotalCarrinho.toFixed(2) : '0.00';
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

    } catch (err) {
        console.error('Erro ao buscar cartões vinculados:', err);
        container.innerHTML = `
            <div class="endereco-resumo-container" style="border: 1px dashed #d9534f; background: #fff;">
                <p style="color: #d9534f; font-size: 14px; margin: 0;">Não foi possível carregar os cartões vinculados. Use a opção de novo cartão.</p>
            </div>
        `;
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

/* ---------- 3. Resumo do Pedido (carrinho) ---------- */
async function carregarResumo() {
    try {
        const response = await fetch(`${API_BASE_URL}/carrinho`, {
            headers: { 'X-Usuario-Id': USUARIO_ID.toString() }
        });
        if (!response.ok) throw new Error('Não foi possível carregar o carrinho.');

        const carrinho = await response.json();
        subtotalCarrinho = carrinho.subtotal || 0;

        $('resumo-subtotal').textContent = formatarBRL(subtotalCarrinho);
        $('resumo-total').textContent = formatarBRL(subtotalCarrinho);

        $('resumo-itens').innerHTML = (carrinho.itens || []).map(item => `
            <div class="product-item">
                <div class="product-img" style="background-color: #eee;"></div>
                <div class="product-details">
                    <p class="product-name">${item.nomeProduto}</p>
                    <p class="product-meta">SKU: ${item.sku} / ${item.cor} / ${item.tamanho}</p>
                    <p class="product-meta">Qtd: ${item.quantidade}</p>
                    <p class="product-price">${formatarBRL(item.subtotal)}</p>
                </div>
            </div>`).join('');
    } catch (error) {
        exibirMensagem(error.message, 'erro');
    }
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

    // Formulário de Novo Endereço (sem nome/sobrenome)
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

    // 2. Novo cartão (se o formulário estiver preenchido e com valor > 0)
    const valorNovo = parseFloat($('novo-cartao-valor').value);
    const numeroNovo = $('cartao-numero').value.replace(/\s+/g, '');

    if (!isNaN(valorNovo) && valorNovo > 0 && numeroNovo) {
        const [mes, ano] = ($('cartao-validade').value || '').split('/').map(p => parseInt(p.trim(), 10));
        const anoCompleto = ano < 100 ? 2000 + ano : ano;

        cartoes.push({
            usuarioCartaoId: null,
            novoCartao: {
                numero: numeroNovo,
                cvv: $('cartao-cvv').value.trim(),
                bandeira: $('cartao-bandeira').value,
                mesValidade: mes,
                anoValidade: anoCompleto,
                salvarNoPerfil: $('save-card').checked
            },
            valor: valorNovo
        });
    }

    return cartoes;
}

function validar(payload) {
    // 1. Validação do Endereço
    if (!payload.usuarioEnderecoId && !payload.novoEndereco) {
        return 'Selecione ou cadastre um endereço de entrega.';
    }

    const e = payload.novoEndereco;
    if (e) {
        if (!e.cep || !e.logradouro || !e.numero || !e.bairro || !e.cidade || !e.estado) {
            return 'Preencha todos os campos obrigatórios do novo endereço.';
        }
    }

    // 2. Validação dos Cartões
    if (!payload.cartoes || payload.cartoes.length === 0) {
        return 'Informe o valor a ser cobrado em pelo menos um cartão.';
    }

    for (const c of payload.cartoes) {
        if (c.valor < 10) {
            return 'O valor mínimo por cartão de crédito é R$ 10,00.';
        }
        if (c.novoCartao) {
            const nc = c.novoCartao;
            if (!nc.numero || !nc.cvv || !Number.isInteger(nc.mesValidade) || !Number.isInteger(nc.anoValidade)) {
                return 'Preencha todos os dados do novo cartão (validade no formato MM/AA).';
            }
        }
    }

    const totalCobrado = payload.cartoes.reduce((acc, c) => acc + c.valor, 0);
    if (totalCobrado < subtotalCarrinho) {
        return `O total nos cartões (R$ ${totalCobrado.toFixed(2)}) é inferior ao valor do pedido (R$ ${subtotalCarrinho.toFixed(2)}).`;
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
    const cores = { erro: 'red', sucesso: 'green', info: 'blue' };
    div.style.color = cores[tipo];
    if (html) div.innerHTML = texto; else div.textContent = texto;
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
