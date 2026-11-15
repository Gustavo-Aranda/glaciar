const IMAGENS_PRODUTOS = {
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

function resolverImagemProduto(item) {
    if (!item) return './assets/img/masculino/alpine-pro.jpg';
    if (item.imagem) return item.imagem;
    const prodId = item.produtoId || item.ProdutoId || item.id || item.Id;
    if (prodId && IMAGENS_PRODUTOS[prodId]) return IMAGENS_PRODUTOS[prodId];

    const nome = (item.nomeProduto || item.nome || '').toLowerCase();
    if (nome.includes('apex')) return './assets/img/masculino/termica-apex.jpg';
    if (nome.includes('alpine')) return './assets/img/masculino/alpine-pro.jpg';
    if (nome.includes('stormbreaker')) return './assets/img/masculino/stormbreaker.jpg';
    if (nome.includes('ridge')) return './assets/img/masculino/ridge-cargo.jpg';
    if (nome.includes('ascent')) return './assets/img/feminino/calca-ascent.jpg';
    if (nome.includes('aurora')) return './assets/img/feminino/jaqueta-aurora.jpg';
    if (nome.includes('merino')) return './assets/img/feminino/segunda-pele-merino.jpg';
    if (nome.includes('trekking xt') || nome.includes('trekking')) return './assets/img/calcados/bota-montanhismo.jpg';
    if (nome.includes('trailblaze')) return './assets/img/calcados/tenis-trekking.jpg';
    if (nome.includes('summit')) return './assets/img/calcados/bota-alpinismo.jpg';
    if (nome.includes('covert')) return './assets/img/equipamentos/mochila-covert.jpg';
    if (nome.includes('k2')) return './assets/img/equipamentos/barraca-k2.jpg';
    if (nome.includes('subzero')) return './assets/img/equipamentos/saco-subzero.jpg';

    return './assets/img/masculino/alpine-pro.jpg';
}

function escaparHtml(texto = '') {
    return String(texto).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

window.IMAGENS_PRODUTOS = IMAGENS_PRODUTOS;
window.resolverImagemProduto = resolverImagemProduto;
window.getProductImageUrl = resolverImagemProduto;
window.escaparHtml = escaparHtml;

async function carregarNovidadesHome() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    const formatarBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

    try {
        const res = await fetch("http://localhost:5205/api/produtos");
        if (!res.ok) throw new Error("Falha ao buscar novidades");
        const produtos = await res.json();
        const destaques = (Array.isArray(produtos) ? produtos : []).slice(0, 4);

        if (destaques.length === 0) throw new Error("Catálogo vazio");

        grid.innerHTML = destaques.map(p => `
            <article class="product-item">
                <a href="produto.html?produto=${encodeURIComponent(p.id)}" style="text-decoration: none; color: inherit;">
                    <img src="${resolverImagemProduto(p)}" alt="${escaparHtml(p.nome)}">
                    <h4>${escaparHtml(p.nome)}</h4>
                    <p class="price">${formatarBRL(p.preco)}</p>
                </a>
            </article>
        `).join('');
    } catch {
        const fallback = [
            { id: 1, nome: 'Jaqueta Térmica Glaciar Apex', preco: 349.90 },
            { id: 2, nome: 'A Nova Jaqueta Alpine Pro', preco: 890.00 },
            { id: 6, nome: 'Calça Ascent XT Feminina', preco: 540.00 },
            { id: 11, nome: 'Mochila de Ataque Covert Alpine 45L', preco: 980.00 }
        ];
        grid.innerHTML = fallback.map(p => `
            <article class="product-item">
                <a href="produto.html?produto=${p.id}" style="text-decoration: none; color: inherit;">
                    <img src="${resolverImagemProduto(p)}" alt="${escaparHtml(p.nome)}">
                    <h4>${escaparHtml(p.nome)}</h4>
                    <p class="price">${formatarBRL(p.preco)}</p>
                </a>
            </article>
        `).join('');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Injeta a Navbar
    const navbarPlaceholder = document.getElementById("navbar-placeholder");
    if (navbarPlaceholder) {
        fetch("./components/navbar.html")
            .then(response => response.text())
            .then(html => {
                navbarPlaceholder.innerHTML = html;
                if (typeof atualizarLinksConta === 'function') atualizarLinksConta();
            });
    }

    carregarNovidadesHome();
});
