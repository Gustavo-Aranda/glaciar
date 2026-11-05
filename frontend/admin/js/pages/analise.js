const API_BASE_URL = 'http://localhost:5205/api';

// Paleta de cores distintas e de alto contraste para diferenciação de linhas por categoria (RNF0043, RNF0045)
const PALETA_CORES_CATEGORIAS = [
    { border: '#E67E22', background: 'rgba(230, 126, 34, 0.12)' }, // Laranja Alpinista
    { border: '#2980B9', background: 'rgba(41, 128, 185, 0.12)' }, // Azul Gelo Profundo
    { border: '#27AE60', background: 'rgba(39, 174, 96, 0.12)' },  // Verde Floresta
    { border: '#8E44AD', background: 'rgba(142, 68, 173, 0.12)' }, // Roxo Ametista
    { border: '#C0392B', background: 'rgba(192, 57, 43, 0.12)' },  // Vermelho Expedição
    { border: '#16A085', background: 'rgba(22, 160, 133, 0.12)' }, // Turquesa Glacial
    { border: '#D35400', background: 'rgba(211, 84, 0, 0.12)' },   // Âmbar Queimado
    { border: '#2C3E50', background: 'rgba(44, 62, 80, 0.12)' }    // Cinza Rocha
];

const formatadorMoedaBRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

let instanciaGrafico = null;
let categoriasDisponiveis = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!validarAcessoAdminTela()) return;

    configurarEventosFiltro();
    await carregarCategoriasDisponiveis();
    await consultarEPlotarGrafico();
});

/**
 * Garante que a tela é restrita ao perfil ADMIN.
 * Caso haja um cliente comum logado na sessão, bloqueia o acesso e redireciona.
 */
function validarAcessoAdminTela() {
    try {
        const raw = sessionStorage.getItem('usuarioLogado');
        if (!raw) return true;

        const usuario = JSON.parse(raw);
        const tipo = usuario?.tipoUsuario;
        if (tipo === 'CLI' || tipo === 0) {
            notificar('Acesso restrito a administradores.', 'erro');
            window.location.href = '../user/login.html';
            return false;
        }
        return true;
    } catch {
        return true;
    }
}

function obterHeadersAdmin() {
    const headers = {
        'Accept': 'application/json',
        'X-Perfil-Usuario': 'ADM'
    };

    try {
        const raw = sessionStorage.getItem('usuarioLogado');
        if (raw) {
            const usuario = JSON.parse(raw);
            if (usuario?.id) {
                headers['X-Usuario-Id'] = String(usuario.id);
            }
        }
    } catch {
        // Ignora erro de parse de sessionStorage
    }

    return headers;
}

function configurarEventosFiltro() {
    const form = document.getElementById('form-filtro-analise');
    const btnSelecionarTodas = document.getElementById('btn-selecionar-todas');
    const btnLimpar = document.getElementById('btn-limpar-categorias');

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await consultarEPlotarGrafico();
    });

    btnSelecionarTodas?.addEventListener('click', () => {
        alternarTodasCategorias(true);
    });

    btnLimpar?.addEventListener('click', () => {
        alternarTodasCategorias(false);
    });
}

async function carregarCategoriasDisponiveis() {
    const container = document.getElementById('categorias-selector');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/relatorios/categorias`, {
            method: 'GET',
            headers: obterHeadersAdmin()
        });

        if (response.status === 403) {
            notificar('Acesso negado: perfil administrador exigido.', 'erro');
            return;
        }

        if (!response.ok) {
            throw new Error('Falha ao carregar categorias.');
        }

        const lista = await response.json();
        categoriasDisponiveis = Array.isArray(lista) ? lista : [];
        renderizarSeletorCategorias(categoriasDisponiveis);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        container.innerHTML = '<span class="loading-categories">Não foi possível carregar as categorias.</span>';
    }
}

function renderizarSeletorCategorias(categorias) {
    const container = document.getElementById('categorias-selector');
    if (!container) return;

    container.innerHTML = '';

    if (!categorias.length) {
        container.innerHTML = '<span>Nenhuma categoria cadastrada no catálogo.</span>';
        return;
    }

    categorias.forEach((cat, idx) => {
        const cor = PALETA_CORES_CATEGORIAS[idx % PALETA_CORES_CATEGORIAS.length].border;
        const label = document.createElement('label');
        label.className = 'category-chip selected';
        label.setAttribute('data-categoria-id', String(cat.id));

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'categoriaId';
        checkbox.value = String(cat.id);
        checkbox.checked = true;
        checkbox.dataset.categoriaNome = cat.nome;

        checkbox.addEventListener('change', () => {
            label.classList.toggle('selected', checkbox.checked);
        });

        const dot = document.createElement('span');
        dot.className = 'category-color-dot';
        dot.style.backgroundColor = cor;

        const texto = document.createElement('span');
        texto.textContent = cat.nome;

        label.appendChild(checkbox);
        label.appendChild(dot);
        label.appendChild(texto);
        container.appendChild(label);
    });
}

function alternarTodasCategorias(selecionar) {
    const checkboxes = document.querySelectorAll('#categorias-selector input[type="checkbox"]');
    checkboxes.forEach((cb) => {
        cb.checked = selecionar;
        cb.closest('.category-chip')?.classList.toggle('selected', selecionar);
    });
}

function obterCategoriaIdsSelecionadas() {
    return Array.from(document.querySelectorAll('#categorias-selector input[type="checkbox"]:checked'))
        .map((cb) => Number.parseInt(cb.value, 10))
        .filter((id) => Number.isInteger(id) && id > 0);
}

/**
 * Validações de Front-end em conformidade com RF0055, RF0056, RF0057 e RN0072.
 */
function validarParametrosFiltro(dataInicioStr, dataFimStr, categoriaIds) {
    if (!dataInicioStr || !dataFimStr) {
        return 'Informe a Data Inicial e a Data Final para realizar a consulta.';
    }

    const [anoIni, mesIni, diaIni] = dataInicioStr.split('-').map(Number);
    const [anoFim, mesFim, diaFim] = dataFimStr.split('-').map(Number);

    const inicio = new Date(Date.UTC(anoIni, mesIni - 1, diaIni));
    const fim = new Date(Date.UTC(anoFim, mesFim - 1, diaFim));

    // RF0056: DataFim >= DataInicio
    if (fim < inicio) {
        return 'A Data Final não pode ser anterior à Data Inicial.';
    }

    // RN0072: Intervalo entre 1 e 24 meses
    const limiteMinimo = new Date(Date.UTC(anoIni, mesIni, diaIni));
    limiteMinimo.setUTCDate(limiteMinimo.getUTCDate() - 1);

    if (fim < limiteMinimo) {
        return 'O intervalo entre a data inicial e a data final deve ser de no mínimo 1 mês.';
    }

    const mesesDiferenca = ((anoFim - anoIni) * 12) + (mesFim - mesIni);
    const limiteMaximo = new Date(Date.UTC(anoIni + 2, mesIni - 1, diaIni));

    if (fim > limiteMaximo || mesesDiferenca > 24) {
        return 'O intervalo entre a data inicial e a data final deve ser de no máximo 24 meses.';
    }

    // RF0057: Ao menos uma categoria selecionada
    if (!Array.isArray(categoriaIds) || categoriaIds.length === 0) {
        return 'Selecione ao menos uma categoria de produto para comparação.';
    }

    return null;
}

async function consultarEPlotarGrafico() {
    const inputInicio = document.getElementById('data-inicio');
    const inputFim = document.getElementById('data-fim');
    const btnGerar = document.getElementById('btn-gerar-grafico');

    const dataInicio = inputInicio?.value || '';
    const dataFim = inputFim?.value || '';
    const categoriaIds = obterCategoriaIdsSelecionadas();

    const erroValidacao = validarParametrosFiltro(dataInicio, dataFim, categoriaIds);
    if (erroValidacao) {
        notificar(erroValidacao, 'erro');
        return;
    }

    const params = new URLSearchParams();
    params.set('dataInicio', dataInicio);
    params.set('dataFim', dataFim);
    categoriaIds.forEach((id) => params.append('categoriaIds', String(id)));

    if (btnGerar) {
        btnGerar.disabled = true;
        btnGerar.textContent = 'Consultando...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/relatorios/vendas-por-categoria?${params.toString()}`, {
            method: 'GET',
            headers: obterHeadersAdmin()
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            const msgErro = payload?.message || payload?.erro || 'Não foi possível gerar o gráfico de vendas.';
            notificar(msgErro, 'erro');
            return;
        }

        atualizarIndicadoresResumo(payload);
        renderizarGraficoLinhas(payload);
    } catch (error) {
        console.error('Erro ao consultar vendas por categoria:', error);
        notificar('Erro de comunicação com o servidor ao consultar o relatório.', 'erro');
    } finally {
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.textContent = 'Gerar Gráfico';
        }
    }
}

function atualizarIndicadoresResumo(dados) {
    const elTotal = document.getElementById('kpi-total-geral');
    const elPeriodo = document.getElementById('kpi-periodo');
    const elCategorias = document.getElementById('kpi-qtd-categorias');

    const labels = Array.isArray(dados?.labels) ? dados.labels : [];
    const series = Array.isArray(dados?.series) ? dados.series : [];
    const totalGeral = Number(dados?.valorTotalGeral || 0);

    if (elTotal) {
        elTotal.textContent = formatadorMoedaBRL.format(totalGeral);
    }

    if (elPeriodo) {
        elPeriodo.innerHTML = labels.length > 0
            ? `${labels[0]} a ${labels[labels.length - 1]}<br><span style="font-size: 0.95rem; font-weight: normal; color: var(--cinza-rocha-claro);">(${labels.length} ${labels.length === 1 ? 'mês' : 'meses'})</span>`
            : '-';
    }

    if (elCategorias) {
        elCategorias.textContent = String(series.length);
    }
}

/**
 * Configura e renderiza o Gráfico de Linhas no Chart.js (RNF0043, RNF0044, RNF0045, RNF0046).
 */
function renderizarGraficoLinhas(dados) {
    const canvas = document.getElementById('financeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const labels = Array.isArray(dados?.labels) ? dados.labels : [];
    const series = Array.isArray(dados?.series) ? dados.series : [];

    // Mapeia cada série para um dataset com cor distinta e linha contínua (preenchida com 0.00 quando sem vendas)
    const datasets = series.map((serie, idx) => {
        const indiceCor = encontrarIndiceCorCategoria(serie.categoriaId, idx);
        const paleta = PALETA_CORES_CATEGORIAS[indiceCor % PALETA_CORES_CATEGORIAS.length];

        return {
            label: serie.categoria,
            data: (serie.valores || []).map((v) => Number(v || 0)),
            borderColor: paleta.border,
            backgroundColor: paleta.background,
            pointBackgroundColor: paleta.border,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            fill: false,
            tension: 0.25,
            spanGaps: false
        };
    });

    if (instanciaGrafico) {
        instanciaGrafico.destroy();
    }

    instanciaGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                // RNF0045: Legenda descritiva na parte inferior identificando categoria e cor
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        color: '#2C3E50'
                    }
                },
                // RNF0046: Tooltip interativo exibindo valor exato em moeda brasileira (R$ 0.000,00)
                tooltip: {
                    backgroundColor: 'rgba(44, 62, 80, 0.95)',
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        title(tooltipItems) {
                            if (!tooltipItems.length) return '';
                            return `Período: ${tooltipItems[0].label}`;
                        },
                        label(context) {
                            const nomeCategoria = context.dataset.label || 'Categoria';
                            const valor = Number(context.parsed.y ?? 0);
                            return ` ${nomeCategoria}: ${formatadorMoedaBRL.format(valor)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Período (Mês/Ano)',
                        color: '#596A7A',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(213, 219, 224, 0.45)'
                    },
                    ticks: {
                        color: '#2C3E50',
                        font: {
                            weight: '600'
                        }
                    }
                },
                // RNF0044: Eixo vertical (Y) formatado em moeda brasileira (R$ 0.000,00) com escala automática
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volume de Vendas (R$)',
                        color: '#596A7A',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(213, 219, 224, 0.6)'
                    },
                    ticks: {
                        color: '#2C3E50',
                        callback(value) {
                            return formatadorMoedaBRL.format(Number(value));
                        }
                    }
                }
            }
        }
    });
}

function encontrarIndiceCorCategoria(categoriaId, fallbackIdx) {
    const idx = categoriasDisponiveis.findIndex((c) => c.id === categoriaId);
    return idx >= 0 ? idx : fallbackIdx;
}

function notificar(mensagem, tipo = 'erro') {
    if (typeof mostrarNotificacao === 'function') {
        mostrarNotificacao(mensagem, tipo);
        return;
    }

    let container = document.getElementById('notificacoes-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificacoes-container';
        container.className = 'notificacoes-container';
        document.body.appendChild(container);
    }

    const alerta = document.createElement('div');
    alerta.className = `notificacao notificacao-${tipo}`;
    alerta.setAttribute('role', 'alert');
    alerta.textContent = mensagem;
    container.appendChild(alerta);
    setTimeout(() => alerta.remove(), 4500);
}
