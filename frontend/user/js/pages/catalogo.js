// Alias de compatibilidade para catalog.js
// Caso a página importe ./js/pages/catalogo.js diretamente, carrega a mesma lógica de catálogo
if (typeof carregarProdutos === 'undefined') {
    const script = document.createElement('script');
    script.src = './js/pages/catalog.js';
    document.head.appendChild(script);
}

