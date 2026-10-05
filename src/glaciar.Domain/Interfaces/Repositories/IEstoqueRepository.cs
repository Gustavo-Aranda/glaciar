using glaciar.Domain.Entities.Catalogos;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IEstoqueRepository
    {
        Task<Estoque?> GetByIdComProdutoAsync(int estoqueId);

        /// <summary>
        /// Decrementa o estoque de forma atômica (UPDATE ... WHERE Quantidade >= quantidade).
        /// Retorna false se não houver saldo suficiente no momento da baixa.
        /// </summary>
        Task<bool> BaixarEstoqueAsync(int estoqueId, int quantidade);
    }
}
