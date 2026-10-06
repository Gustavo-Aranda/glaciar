using glaciar.Domain.Entities.Catalogos;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IProdutoRepository
    {
        /// <summary>Lista produtos visíveis (com estoques), opcionalmente filtrando pelo nome da categoria.</summary>
        Task<IEnumerable<Produto>> GetVisiveisAsync(string? categoria);

        /// <summary>Obtém um produto visível pelo seu ID, com seus estoques.</summary>
        Task<Produto?> GetByIdAsync(int id);
    }
}
