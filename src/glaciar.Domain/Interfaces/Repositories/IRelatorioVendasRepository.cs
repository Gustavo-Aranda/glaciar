using glaciar.Domain.Entities.Catalogos;

namespace glaciar.Domain.Interfaces.Repositories
{
    public record VendaMensalCategoriaProjection(
        int CategoriaId,
        string CategoriaNome,
        int Ano,
        int Mes,
        decimal ValorTotal
    );

    public interface IRelatorioVendasRepository
    {
        /// <summary>
        /// Lista todas as categorias cadastradas ordenadas por nome.
        /// </summary>
        Task<IReadOnlyList<Categoria>> ObterCategoriasAsync();

        /// <summary>
        /// Obtém as categorias correspondentes aos IDs ou nomes informados no filtro.
        /// </summary>
        Task<IReadOnlyList<Categoria>> ObterCategoriasPorFiltroAsync(
            IReadOnlyCollection<int> ids,
            IReadOnlyCollection<string> nomes);

        /// <summary>
        /// Projeção otimizada no banco (PostgreSQL GROUP BY + SUM) considerando estritamente
        /// pedidos com status ENTREGUE dentro do intervalo [dataInicioUtc, dataFimUtc].
        /// </summary>
        Task<IReadOnlyList<VendaMensalCategoriaProjection>> ObterVendasEntreguesPorCategoriaEMesAsync(
            DateTime dataInicioUtc,
            DateTime dataFimUtc,
            IReadOnlyCollection<int> categoriaIds);
    }
}

