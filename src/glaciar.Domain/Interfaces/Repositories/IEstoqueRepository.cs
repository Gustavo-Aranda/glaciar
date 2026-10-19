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

        /// <summary>
        /// Devolve unidades ao estoque de forma atômica (UPDATE ... SET Quantidade = Quantidade + n).
        /// Usado quando um pedido é Cancelado ou tem o pagamento reprovado.
        /// </summary>
        Task ReporEstoqueAsync(int estoqueId, int quantidade);
    }
}
