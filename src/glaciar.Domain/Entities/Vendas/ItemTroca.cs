namespace glaciar.Domain.Entities.Vendas
{
    /// <summary>
    /// Representa a seleção de uma linha do pedido (PedidoProduto) e a quantidade de unidades
    /// a serem trocadas nessa solicitação.
    /// </summary>
    public sealed record ItemTroca(int PedidoProdutoId, int Quantidade);
}
