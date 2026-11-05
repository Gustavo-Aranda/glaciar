const API_BASE_URL = 'http://localhost:5205/api';

// Mapa de nomes de cor -> hex para os swatches (cores desconhecidas usam cinza)
const CORES_HEX = {
    'preto': '#111111',
    'branco': '#f5f5f5',
    'cinza': '#808080',
    'cinza/laranja': '#d9772b',
    'azul': '#2c3e50',
    'azul marinho': '#1b2a41',
    'berry fig': '#6a2e41',
    'vermelho': '#a8201a',
    'verde': '#2e5e3e',
    'bordo': '#6a2e41',
    'bege': '#d9c7a3',
    'marrom': '#5b3a29',
    'amarelo': '#e0b43a',
    'laranja': '#d9772b'
};

// Catálogo Mockado por Categoria (fallback e complemento visual para o front-end)
const PRODUTOS_MOCK_POR_CATEGORIA = {
    'Masculino': [
        {
            id: 1,
            nome: "Jaqueta Térmica Glaciar Apex",
            descricao: 'Jaqueta impermeável com isolamento térmico de alta performance para frio extremo.',
            tipo: 'Vestuario',
            preco: 349.90,
            imagem: './assets/img/masculino/termica-apex.jpg',
            badge: 'Novo',
            tags: ['impermeável', 'isolamento térmico'],
            isMock: false,
            estoques: [
                { estoqueId: 1, tamanho: 'M', cor: 'Preto', quantidade: 5 }
            ]
        },
        {
            id: 2,
            nome: 'A Nova Jaqueta Alpine Pro',
            descricao: 'Fleece técnico e durável para aquecimento extremo nas montanhas.',
            tipo: 'Vestuario',
            preco: 890.00,
            imagem: './assets/img/masculino/alpine-pro.jpg',
            badge: 'Destaque',
            tags: ['isolamento térmico', 'fleece'],
            isMock: true,
            estoques: [
                { estoqueId: 201, tamanho: 'P', cor: 'Azul Marinho', quantidade: 6 },
                { estoqueId: 202, tamanho: 'M', cor: 'Azul Marinho', quantidade: 8 },
                { estoqueId: 203, tamanho: 'G', cor: 'Azul Marinho', quantidade: 10 },
                { estoqueId: 204, tamanho: 'GG', cor: 'Azul Marinho', quantidade: 4 },
                { estoqueId: 205, tamanho: 'P', cor: 'Preto', quantidade: 7 },
                { estoqueId: 206, tamanho: 'M', cor: 'Preto', quantidade: 12 },
                { estoqueId: 207, tamanho: 'G', cor: 'Preto', quantidade: 9 },
                { estoqueId: 208, tamanho: 'GG', cor: 'Preto', quantidade: 5 },
                { estoqueId: 209, tamanho: 'P', cor: 'Verde', quantidade: 4 },
                { estoqueId: 210, tamanho: 'M', cor: 'Verde', quantidade: 8 },
                { estoqueId: 211, tamanho: 'G', cor: 'Verde', quantidade: 6 },
                { estoqueId: 212, tamanho: 'GG', cor: 'Verde', quantidade: 0 }
            ]
        },
        {
            id: 4,
            nome: 'Jaqueta Impermeável StormBreaker GTX',
            descricao: 'Hardshell impermeável e respirável de 3 camadas com costuras 100% seladas para tempestades alpinas.',
            tipo: 'Vestuario',
            preco: 1490.00,
            imagem: './assets/img/masculino/stormbreaker.jpg',
            badge: 'Novo',
            tags: ['impermeável', 'cortavento'],
            isMock: true,
            estoques: [
                { estoqueId: 401, tamanho: 'P', cor: 'Laranja', quantidade: 5 },
                { estoqueId: 402, tamanho: 'M', cor: 'Laranja', quantidade: 9 },
                { estoqueId: 403, tamanho: 'G', cor: 'Laranja', quantidade: 7 },
                { estoqueId: 404, tamanho: 'GG', cor: 'Laranja', quantidade: 4 },
                { estoqueId: 405, tamanho: 'P', cor: 'Preto', quantidade: 8 },
                { estoqueId: 406, tamanho: 'M', cor: 'Preto', quantidade: 11 },
                { estoqueId: 407, tamanho: 'G', cor: 'Preto', quantidade: 6 },
                { estoqueId: 408, tamanho: 'GG', cor: 'Preto', quantidade: 3 },
                { estoqueId: 409, tamanho: 'P', cor: 'Cinza', quantidade: 4 },
                { estoqueId: 410, tamanho: 'M', cor: 'Cinza', quantidade: 7 },
                { estoqueId: 411, tamanho: 'G', cor: 'Cinza', quantidade: 5 },
                { estoqueId: 412, tamanho: 'GG', cor: 'Cinza', quantidade: 0 }
            ]
        },
        {
            id: 5,
            nome: 'Calça Técnica Ridge Cargo Ripstop',
            descricao: 'Calça de trekking em tecido Ripstop de alta resistência à abrasão com joelhos articulados e acabamento DWR.',
            tipo: 'Vestuario',
            preco: 650.00,
            imagem: './assets/img/masculino/ridge-cargo.jpg',
            badge: 'Novo',
            tags: ['ripstop', 'repelente à água'],
            isMock: true,
            estoques: [
                { estoqueId: 501, tamanho: 'P', cor: 'Verde', quantidade: 8 },
                { estoqueId: 502, tamanho: 'M', cor: 'Verde', quantidade: 14 },
                { estoqueId: 503, tamanho: 'G', cor: 'Verde', quantidade: 10 },
                { estoqueId: 504, tamanho: 'GG', cor: 'Verde', quantidade: 6 },
                { estoqueId: 505, tamanho: 'P', cor: 'Bege', quantidade: 7 },
                { estoqueId: 506, tamanho: 'M', cor: 'Bege', quantidade: 9 },
                { estoqueId: 507, tamanho: 'G', cor: 'Bege', quantidade: 5 },
                { estoqueId: 508, tamanho: 'GG', cor: 'Bege', quantidade: 0 },
                { estoqueId: 509, tamanho: 'P', cor: 'Preto', quantidade: 10 },
                { estoqueId: 510, tamanho: 'M', cor: 'Preto', quantidade: 12 },
                { estoqueId: 511, tamanho: 'G', cor: 'Preto', quantidade: 8 },
                { estoqueId: 512, tamanho: 'GG', cor: 'Preto', quantidade: 4 }
            ]
        }
    ],
    'Feminino': [
        {
            id: 6,
            nome: 'Calça Ascent XT Feminina',
            descricao: 'Calça de escalada e trekking resistente com elasticidade em 4 direções e cós anatômico de alto conforto.',
            tipo: 'Vestuario',
            preco: 620.00,
            imagem: './assets/img/feminino/calca-ascent.jpg',
            badge: 'Destaque',
            tags: ['elasticidade 4D', 'escalada'],
            isMock: true,
            estoques: [
                { estoqueId: 601, tamanho: 'PP', cor: 'Berry Fig', quantidade: 8 },
                { estoqueId: 602, tamanho: 'P', cor: 'Berry Fig', quantidade: 12 },
                { estoqueId: 603, tamanho: 'M', cor: 'Berry Fig', quantidade: 10 },
                { estoqueId: 604, tamanho: 'G', cor: 'Berry Fig', quantidade: 6 },
                { estoqueId: 605, tamanho: 'PP', cor: 'Preto', quantidade: 9 },
                { estoqueId: 606, tamanho: 'P', cor: 'Preto', quantidade: 15 },
                { estoqueId: 607, tamanho: 'M', cor: 'Preto', quantidade: 11 },
                { estoqueId: 608, tamanho: 'G', cor: 'Preto', quantidade: 7 },
                { estoqueId: 609, tamanho: 'PP', cor: 'Verde', quantidade: 5 },
                { estoqueId: 610, tamanho: 'P', cor: 'Verde', quantidade: 8 },
                { estoqueId: 611, tamanho: 'M', cor: 'Verde', quantidade: 6 },
                { estoqueId: 612, tamanho: 'G', cor: 'Verde', quantidade: 0 }
            ]
        },
        {
            id: 7,
            nome: 'Jaqueta Térmica Aurora Down Hoody',
            descricao: 'Isolamento em pluma 800-fill ultracompacta com tratamento hidrofóbico para expedições em clima glacial.',
            tipo: 'Vestuario',
            preco: 1190.00,
            imagem: './assets/img/feminino/jaqueta-aurora.jpg',
            badge: 'Novo',
            tags: ['pluma 800-fill', 'ultraleve'],
            isMock: true,
            estoques: [
                { estoqueId: 701, tamanho: 'PP', cor: 'Bordo', quantidade: 5 },
                { estoqueId: 702, tamanho: 'P', cor: 'Bordo', quantidade: 9 },
                { estoqueId: 703, tamanho: 'M', cor: 'Bordo', quantidade: 8 },
                { estoqueId: 704, tamanho: 'G', cor: 'Bordo', quantidade: 4 },
                { estoqueId: 705, tamanho: 'PP', cor: 'Azul', quantidade: 6 },
                { estoqueId: 706, tamanho: 'P', cor: 'Azul', quantidade: 10 },
                { estoqueId: 707, tamanho: 'M', cor: 'Azul', quantidade: 7 },
                { estoqueId: 708, tamanho: 'G', cor: 'Azul', quantidade: 3 },
                { estoqueId: 709, tamanho: 'PP', cor: 'Branco', quantidade: 4 },
                { estoqueId: 710, tamanho: 'P', cor: 'Branco', quantidade: 6 },
                { estoqueId: 711, tamanho: 'M', cor: 'Branco', quantidade: 5 },
                { estoqueId: 712, tamanho: 'G', cor: 'Branco', quantidade: 0 }
            ]
        },
        {
            id: 8,
            nome: 'Top Segunda Pele Merino Warm',
            descricao: 'Base layer em lã merino termorreguladora com controle natural de odores e costuras planas antiatrito.',
            tipo: 'Vestuario',
            preco: 390.00,
            imagem: './assets/img/feminino/segunda-pele-merino.jpg',
            badge: 'Novo',
            tags: ['lã merino', 'segunda pele'],
            isMock: true,
            estoques: [
                { estoqueId: 801, tamanho: 'PP', cor: 'Preto', quantidade: 10 },
                { estoqueId: 802, tamanho: 'P', cor: 'Preto', quantidade: 14 },
                { estoqueId: 803, tamanho: 'M', cor: 'Preto', quantidade: 12 },
                { estoqueId: 804, tamanho: 'G', cor: 'Preto', quantidade: 8 },
                { estoqueId: 805, tamanho: 'PP', cor: 'Cinza', quantidade: 7 },
                { estoqueId: 806, tamanho: 'P', cor: 'Cinza', quantidade: 11 },
                { estoqueId: 807, tamanho: 'M', cor: 'Cinza', quantidade: 9 },
                { estoqueId: 808, tamanho: 'G', cor: 'Cinza', quantidade: 5 },
                { estoqueId: 809, tamanho: 'PP', cor: 'Azul Marinho', quantidade: 6 },
                { estoqueId: 810, tamanho: 'P', cor: 'Azul Marinho', quantidade: 9 },
                { estoqueId: 811, tamanho: 'M', cor: 'Azul Marinho', quantidade: 7 },
                { estoqueId: 812, tamanho: 'G', cor: 'Azul Marinho', quantidade: 4 }
            ]
        }
    ],
    'Calçados': [
        {
            id: 3,
            nome: 'Botas de Alta Montanha Trekking XT',
            descricao: 'Calçado impermeável com solado Vibram para terrenos acidentados.',
            tipo: 'Calcado',
            preco: 1250.00,
            imagem: './assets/img/calcados/bota-montanhismo.jpg',
            badge: 'Destaque',
            tags: ['solado vibram', 'impermeável'],
            isMock: true,
            estoques: [
                { estoqueId: 301, tamanho: '37', cor: 'Cinza/Laranja', quantidade: 4 },
                { estoqueId: 302, tamanho: '38', cor: 'Cinza/Laranja', quantidade: 6 },
                { estoqueId: 303, tamanho: '39', cor: 'Cinza/Laranja', quantidade: 8 },
                { estoqueId: 304, tamanho: '40', cor: 'Cinza/Laranja', quantidade: 7 },
                { estoqueId: 305, tamanho: '41', cor: 'Cinza/Laranja', quantidade: 5 },
                { estoqueId: 306, tamanho: '42', cor: 'Cinza/Laranja', quantidade: 6 },
                { estoqueId: 307, tamanho: '43', cor: 'Cinza/Laranja', quantidade: 3 },
                { estoqueId: 308, tamanho: '44', cor: 'Cinza/Laranja', quantidade: 2 },
                { estoqueId: 309, tamanho: '37', cor: 'Preto', quantidade: 3 },
                { estoqueId: 310, tamanho: '38', cor: 'Preto', quantidade: 7 },
                { estoqueId: 311, tamanho: '39', cor: 'Preto', quantidade: 9 },
                { estoqueId: 312, tamanho: '40', cor: 'Preto', quantidade: 10 },
                { estoqueId: 313, tamanho: '41', cor: 'Preto', quantidade: 8 },
                { estoqueId: 314, tamanho: '42', cor: 'Preto', quantidade: 5 },
                { estoqueId: 315, tamanho: '43', cor: 'Preto', quantidade: 4 },
                { estoqueId: 316, tamanho: '44', cor: 'Preto', quantidade: 0 },
                { estoqueId: 317, tamanho: '37', cor: 'Marrom', quantidade: 2 },
                { estoqueId: 318, tamanho: '38', cor: 'Marrom', quantidade: 5 },
                { estoqueId: 319, tamanho: '39', cor: 'Marrom', quantidade: 6 },
                { estoqueId: 320, tamanho: '40', cor: 'Marrom', quantidade: 8 },
                { estoqueId: 321, tamanho: '41', cor: 'Marrom', quantidade: 7 },
                { estoqueId: 322, tamanho: '42', cor: 'Marrom', quantidade: 4 },
                { estoqueId: 323, tamanho: '43', cor: 'Marrom', quantidade: 3 },
                { estoqueId: 324, tamanho: '44', cor: 'Marrom', quantidade: 2 }
            ]
        },
        {
            id: 9,
            nome: 'Tênis Fast Hiking TrailBlaze Pro',
            descricao: 'Tênis de aproximação e hiking veloz com entressola de dupla densidade e biqueira reforçada em TPU.',
            tipo: 'Calcado',
            preco: 890.00,
            imagem: './assets/img/calcados/tenis-trekking.jpg',
            badge: 'Novo',
            tags: ['fast hiking', 'alta tração'],
            isMock: true,
            estoques: [
                { estoqueId: 901, tamanho: '37', cor: 'Verde', quantidade: 6 },
                { estoqueId: 902, tamanho: '38', cor: 'Verde', quantidade: 8 },
                { estoqueId: 903, tamanho: '39', cor: 'Verde', quantidade: 10 },
                { estoqueId: 904, tamanho: '40', cor: 'Verde', quantidade: 9 },
                { estoqueId: 905, tamanho: '41', cor: 'Verde', quantidade: 7 },
                { estoqueId: 906, tamanho: '42', cor: 'Verde', quantidade: 5 },
                { estoqueId: 907, tamanho: '43', cor: 'Verde', quantidade: 4 },
                { estoqueId: 908, tamanho: '44', cor: 'Verde', quantidade: 3 },
                { estoqueId: 909, tamanho: '37', cor: 'Preto', quantidade: 5 },
                { estoqueId: 910, tamanho: '38', cor: 'Preto', quantidade: 9 },
                { estoqueId: 911, tamanho: '39', cor: 'Preto', quantidade: 11 },
                { estoqueId: 912, tamanho: '40', cor: 'Preto', quantidade: 8 },
                { estoqueId: 913, tamanho: '41', cor: 'Preto', quantidade: 6 },
                { estoqueId: 914, tamanho: '42', cor: 'Preto', quantidade: 4 },
                { estoqueId: 915, tamanho: '43', cor: 'Preto', quantidade: 0 },
                { estoqueId: 916, tamanho: '44', cor: 'Preto', quantidade: 2 }
            ]
        },
        {
            id: 10,
            nome: 'Bota Alpinismo Glaciar Summit GTX',
            descricao: 'Bota rígida compatível com crampons semiautomáticos e isolamento térmico Primaloft para travessias em neve.',
            tipo: 'Calcado',
            preco: 1890.00,
            imagem: './assets/img/calcados/bota-alpinismo.jpg',
            badge: 'Novo',
            tags: ['alta montanha', 'cramponável'],
            isMock: true,
            estoques: [
                { estoqueId: 1001, tamanho: '37', cor: 'Amarelo', quantidade: 2 },
                { estoqueId: 1002, tamanho: '38', cor: 'Amarelo', quantidade: 4 },
                { estoqueId: 1003, tamanho: '39', cor: 'Amarelo', quantidade: 5 },
                { estoqueId: 1004, tamanho: '40', cor: 'Amarelo', quantidade: 6 },
                { estoqueId: 1005, tamanho: '41', cor: 'Amarelo', quantidade: 5 },
                { estoqueId: 1006, tamanho: '42', cor: 'Amarelo', quantidade: 4 },
                { estoqueId: 1007, tamanho: '43', cor: 'Amarelo', quantidade: 3 },
                { estoqueId: 1008, tamanho: '44', cor: 'Amarelo', quantidade: 2 },
                { estoqueId: 1009, tamanho: '37', cor: 'Preto', quantidade: 0 },
                { estoqueId: 1010, tamanho: '38', cor: 'Preto', quantidade: 3 },
                { estoqueId: 1011, tamanho: '39', cor: 'Preto', quantidade: 6 },
                { estoqueId: 1012, tamanho: '40', cor: 'Preto', quantidade: 7 },
                { estoqueId: 1013, tamanho: '41', cor: 'Preto', quantidade: 6 },
                { estoqueId: 1014, tamanho: '42', cor: 'Preto', quantidade: 5 },
                { estoqueId: 1015, tamanho: '43', cor: 'Preto', quantidade: 3 },
                { estoqueId: 1016, tamanho: '44', cor: 'Preto', quantidade: 1 }
            ]
        }
    ],
    'Equipamentos': [
        {
            id: 11,
            nome: 'Mochila de Ataque Covert Alpine 45L',
            descricao: 'Mochila técnica ultraleve em Nylon Cordura com suporte para piolet, bastões e sistema de hidratação.',
            tipo: 'Equipamento',
            preco: 980.00,
            imagem: './assets/img/equipamentos/mochila-covert.jpg',
            badge: 'Destaque',
            tags: ['nylon cordura', '45 litros'],
            isMock: true,
            estoques: [
                { estoqueId: 1101, tamanho: '35L', cor: 'Preto', quantidade: 8 },
                { estoqueId: 1102, tamanho: '45L', cor: 'Preto', quantidade: 12 },
                { estoqueId: 1103, tamanho: '65L', cor: 'Preto', quantidade: 6 },
                { estoqueId: 1104, tamanho: '35L', cor: 'Laranja', quantidade: 5 },
                { estoqueId: 1105, tamanho: '45L', cor: 'Laranja', quantidade: 9 },
                { estoqueId: 1106, tamanho: '65L', cor: 'Laranja', quantidade: 4 },
                { estoqueId: 1107, tamanho: '35L', cor: 'Azul', quantidade: 6 },
                { estoqueId: 1108, tamanho: '45L', cor: 'Azul', quantidade: 7 },
                { estoqueId: 1109, tamanho: '65L', cor: 'Azul', quantidade: 0 }
            ]
        },
        {
            id: 12,
            nome: 'Barraca Expedição K2 4 Estações',
            descricao: 'Barraca geodésica para ventos extremos e neve, com varetas em alumínio DAC Featherlite e coluna d\'água de 5000mm.',
            tipo: 'Equipamento',
            preco: 2450.00,
            imagem: './assets/img/equipamentos/barraca-k2.jpg',
            badge: 'Novo',
            tags: ['4 estações', 'coluna 5000mm'],
            isMock: true,
            estoques: [
                { estoqueId: 1201, tamanho: '2P', cor: 'Laranja', quantidade: 5 },
                { estoqueId: 1202, tamanho: '3P', cor: 'Laranja', quantidade: 3 },
                { estoqueId: 1203, tamanho: '2P', cor: 'Amarelo', quantidade: 4 },
                { estoqueId: 1204, tamanho: '3P', cor: 'Amarelo', quantidade: 2 }
            ]
        },
        {
            id: 13,
            nome: 'Saco de Dormir SubZero -15°C Pro',
            descricao: 'Saco de dormir tipo sarcófago com colar térmico, isolamento em pluma hidrofóbica e tecido ripstop DWR.',
            tipo: 'Equipamento',
            preco: 1320.00,
            imagem: './assets/img/equipamentos/saco-subzero.jpg',
            badge: 'Novo',
            tags: ['conforto -15°C', 'sarcófago'],
            isMock: true,
            estoques: [
                { estoqueId: 1301, tamanho: 'Regular', cor: 'Azul Marinho', quantidade: 9 },
                { estoqueId: 1302, tamanho: 'Longo', cor: 'Azul Marinho', quantidade: 6 },
                { estoqueId: 1303, tamanho: 'Regular', cor: 'Cinza', quantidade: 7 },
                { estoqueId: 1304, tamanho: 'Longo', cor: 'Cinza', quantidade: 4 }
            ]
        }
    ]
};

function obterCategoriaPagina() {
    const mainEl = document.querySelector('[data-categoria]');
    if (mainEl && mainEl.dataset.categoria) {
        return mainEl.dataset.categoria;
    }
    const path = window.location.pathname.toLowerCase();
    if (path.includes('feminino')) return 'Feminino';
    if (path.includes('calcados')) return 'Calçados';
    if (path.includes('equipamentos')) return 'Equipamentos';
    return 'Masculino';
}

const CATEGORIA_PAGINA = obterCategoriaPagina();
const estadoProdutos = new Map(); // produtoId -> { produto, corSelecionada }

// Inicializa o estado com os produtos mockados imediatamente para que o DOM estático funcione sem espera
function inicializarEstadoMock() {
    const mocks = PRODUTOS_MOCK_POR_CATEGORIA[CATEGORIA_PAGINA] || [];
    mocks.forEach(p => {
        estadoProdutos.set(p.id, { produto: p, corSelecionada: coresDoProduto(p)[0] });
    });
}

inicializarEstadoMock();
document.addEventListener('DOMContentLoaded', carregarProdutos);

async function carregarProdutos() {
    const grid = document.getElementById('products-grid');
    const contador = document.getElementById('items-count');
    if (!grid) return;

    const mocksCategoria = PRODUTOS_MOCK_POR_CATEGORIA[CATEGORIA_PAGINA] || [];

    if (window.LoadingService) window.LoadingService.show('Carregando produtos...');
    try {
        const response = await fetch(`${API_BASE_URL}/produtos?categoria=${encodeURIComponent(CATEGORIA_PAGINA)}`);
        if (!response.ok) throw new Error(await response.text());

        const produtosApi = await response.json();
        const produtosFinais = mesclarProdutosApiComMock(produtosApi, mocksCategoria);

        renderizarListaProdutos(grid, contador, produtosFinais);
    } catch (error) {
        console.warn('API indisponível ou sem resposta, utilizando catálogo mockado local:', error);
        renderizarListaProdutos(grid, contador, mocksCategoria);
    } finally {
        if (window.LoadingService) window.LoadingService.hide();
    }
}

function mesclarProdutosApiComMock(produtosApi, mocksCategoria) {
    if (!Array.isArray(produtosApi) || produtosApi.length === 0) {
        return mocksCategoria;
    }

    const lista = produtosApi.map(pApi => {
        const mockEquivalente = mocksCategoria.find(
            m => m.id === pApi.id || m.nome.toLowerCase() === (pApi.nome || '').toLowerCase()
        );
        return {
            ...pApi,
            imagem: mockEquivalente?.imagem || './assets/img/masculino/alpine-pro.jpg',
            badge: mockEquivalente?.badge || 'Novo',
            tags: mockEquivalente?.tags || [pApi.tipo],
            isMock: false
        };
    });

    // Complementa com os produtos mockados da categoria que ainda não estiverem cadastrados no banco
    mocksCategoria.forEach(mock => {
        const jaExiste = lista.some(
            p => p.id === mock.id || (p.nome || '').toLowerCase() === mock.nome.toLowerCase()
        );
        if (!jaExiste) {
            lista.push(mock);
        }
    });

    return lista;
}

function renderizarListaProdutos(grid, contador, produtos) {
    grid.innerHTML = '';
    estadoProdutos.clear();

    produtos.forEach(p => {
        estadoProdutos.set(p.id, { produto: p, corSelecionada: coresDoProduto(p)[0] });
        grid.appendChild(criarCard(p));
    });

    if (contador) {
        contador.textContent = `${produtos.length} ${produtos.length === 1 ? 'Item' : 'Itens'}`;
    }
    if (produtos.length === 0) {
        grid.innerHTML = '<p>Nenhum produto encontrado.</p>';
    }
}

function coresDoProduto(produto) {
    return [...new Set((produto.estoques || []).map(e => e.cor))];
}

function escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

function formatarPreco(valor) {
    return `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    const tagsLista = Array.isArray(produto.tags) && produto.tags.length > 0
        ? produto.tags
        : [produto.tipo];
    const tagsHtml = tagsLista.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

    const imgUrl = produto.imagem || './assets/img/masculino/alpine-pro.jpg';
    const badgeTexto = produto.badge || 'Novo';
    const isEquipamento = (produto.tipo || '').toLowerCase().includes('equipamento') || CATEGORIA_PAGINA === 'Equipamentos';

    article.innerHTML = `
        <div class="product-img-wrapper">
            <span class="badge badge-white">${escapeHtml(badgeTexto)}</span>
            <a href="produto.html?produto=${produto.id}" class="img-link">
                <div class="img-placeholder" style="background-image: url('${imgUrl}')"></div>
            </a>

            <button class="btn-quick-add" onclick="toggleSizeSelector(this)">Adição Rápida</button>

            <div class="size-selector-overlay ${isEquipamento ? 'overlay-equipamentos' : ''} hidden"></div>
        </div>

        <div class="product-info">
            <div class="color-swatches">${swatches}</div>
            <h3 class="product-title"><a href="produto.html?produto=${produto.id}">${escapeHtml(produto.nome)}</a></h3>
            <p class="product-price">${formatarPreco(produto.preco)}</p>
            <div class="product-tags">${tagsHtml}</div>
        </div>
    `;

    renderizarTamanhos(article, produto.id);
    return article;
}

// Monta a grade de tamanhos de acordo com a cor selecionada
function renderizarTamanhos(article, produtoId) {
    const registro = estadoProdutos.get(Number(produtoId));
    if (!registro) return;

    const { produto, corSelecionada } = registro;
    const overlay = article.querySelector('.size-selector-overlay');
    if (!overlay) return;
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
                btn.addEventListener('click', () => addToBag(produto, e, btn));
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
    const estado = estadoProdutos.get(Number(produtoId));
    if (!estado) return;
    estado.corSelecionada = cor;

    const article = swatchEl.closest('.product-card');
    article.querySelectorAll('.swatch').forEach(s => s.classList.remove('checked'));
    swatchEl.classList.add('checked');
    renderizarTamanhos(article, Number(produtoId));
}

// Mostra/Esconde a grade de tamanhos no Card
function toggleSizeSelector(element) {
    const wrapper = element.closest('.product-img-wrapper');
    if (!wrapper) return;
    const sizeOverlay = wrapper.querySelector('.size-selector-overlay');
    const quickAddBtn = wrapper.querySelector('.btn-quick-add');

    if (sizeOverlay.classList.contains('hidden')) {
        sizeOverlay.classList.remove('hidden');
        if (quickAddBtn) quickAddBtn.style.display = 'none';
    } else {
        sizeOverlay.classList.add('hidden');
        if (quickAddBtn) quickAddBtn.style.display = 'block';
    }
}

function exibirToastCarrinho(produto, estoque) {
    const titleEl = document.getElementById('toast-title');
    const priceEl = document.getElementById('toast-price');
    const colorEl = document.getElementById('toast-color');
    const sizeEl = document.getElementById('toast-size');
    const imgEl = document.getElementById('toast-img');
    const toastEl = document.getElementById('cart-toast');

    if (titleEl) titleEl.textContent = `1x ${produto.nome}`;
    if (priceEl) priceEl.textContent = formatarPreco(produto.preco);
    if (colorEl) colorEl.textContent = estoque.cor;
    if (sizeEl) sizeEl.textContent = estoque.tamanho;
    if (imgEl && produto.imagem) {
        imgEl.style.backgroundImage = `url('${produto.imagem}')`;
    }
    if (toastEl) toastEl.classList.remove('hidden');

    // Oculta todas as grades de tamanho que estiverem abertas
    document.querySelectorAll('.size-selector-overlay').forEach(overlay => overlay.classList.add('hidden'));
    document.querySelectorAll('.btn-quick-add').forEach(btn => btn.style.display = 'block');
}

// Adiciona o item (estoque escolhido) ao carrinho via API ou via Mock e abre o Toast
async function addToBag(produtoOuTamanho, estoqueOuBtn, btnElement) {
    let produto = produtoOuTamanho;
    let estoque = estoqueOuBtn;
    let btn = btnElement;

    // Suporte a chamada direta do HTML estático: addToBag('M', this)
    if (typeof produtoOuTamanho === 'string') {
        const tamanhoStr = produtoOuTamanho;
        btn = estoqueOuBtn instanceof HTMLElement ? estoqueOuBtn : null;
        const card = btn ? btn.closest('.product-card') : null;
        const prodId = card ? Number(card.dataset.produtoId) : null;
        const registro = prodId ? estadoProdutos.get(prodId) : null;

        if (registro) {
            produto = registro.produto;
            estoque = registro.produto.estoques.find(
                e => e.cor === registro.corSelecionada && e.tamanho === tamanhoStr
            ) || { estoqueId: 0, tamanho: tamanhoStr, cor: registro.corSelecionada, quantidade: 1 };
        } else {
            const tituloCard = card?.querySelector('.product-title')?.textContent?.trim() || 'Produto Glaciar';
            const precoCard = card?.querySelector('.product-price')?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || 0;
            const corCard = card?.querySelector('.swatch.checked')?.getAttribute('title') || 'Padrão';
            produto = { nome: tituloCard, preco: Number(precoCard), isMock: true };
            estoque = { estoqueId: 0, tamanho: tamanhoStr, cor: corCard, quantidade: 1 };
        }
    }

    const usuarioId = typeof obterIdUsuarioAtual === 'function' ? obterIdUsuarioAtual() : null;

    // Se for um produto puramente mockado ou sem sessão de backend ativa, exibe o Toast diretamente
    if (produto.isMock && !usuarioId) {
        exibirToastCarrinho(produto, estoque);
        return;
    }

    if (!usuarioId) {
        if (typeof exigirIdUsuario === 'function') {
            exigirIdUsuario();
            return;
        }
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Adicionando...';
    }

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
            // Caso o item seja do catálogo mockado e ainda não exista no banco, confirma visualmente via Toast
            if (produto.isMock) {
                exibirToastCarrinho(produto, estoque);
                return;
            }
            const err = await response.json().catch(() => null);
            const msg = err?.message || 'Não foi possível adicionar o item ao carrinho.';
            if (window.Toast) window.Toast.showError('Erro ao adicionar', msg);
            return;
        }

        exibirToastCarrinho(produto, estoque);
    } catch (error) {
        if (produto.isMock) {
            exibirToastCarrinho(produto, estoque);
            return;
        }
        console.error('Erro ao adicionar ao carrinho:', error);
        if (window.Toast) window.Toast.showError('Erro de conexão', 'Não foi possível conectar ao servidor.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = estoque.tamanho;
        }
    }
}

// Fecha o Toast
function closeToast() {
    const toast = document.getElementById('cart-toast');
    if (toast) toast.classList.add('hidden');
}
