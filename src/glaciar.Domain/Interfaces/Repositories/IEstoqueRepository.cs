using glaciar.Domain.Entities.Catalogos;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IEstoqueRepository
    {
        Task<Estoque?> GetByIdComProdutoAsync(int estoqueId);

        /// <summary>
        /// Decrementa o estoque físico de forma atômica (UPDATE ... WHERE Quantidade >= quantidade).
        /// Retorna false se não houver saldo suficiente no momento da baixa.
        /// Chamado no momento em que o item é adicionado ou aumentado no carrinho.
        /// </summary>
        Task<bool> BaixarEstoqueAsync(int estoqueId, int quantidade);

        /// <summary>
        /// Devolve unidades ao estoque físico de forma atômica (UPDATE ... SET Quantidade = Quantidade + n).
        /// Usado universalmente (DRY): remoção/redução de item no carrinho, expiração de carrinho (15 min),
        /// cancelamento de pedido, pagamento recusado e recebimento de devolução/troca.
        /// </summary>
        Task ReporEstoqueAsync(int estoqueId, int quantidade);
    }
}
