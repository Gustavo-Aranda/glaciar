namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>
    /// Lote de alterações de quantidade enviado pelo carrinho antes de seguir para o checkout.
    /// O front envia apenas IDs e quantidades — preço e frete são sempre calculados no backend.
    /// </summary>
    public class CarrinhoSincronizarDTO
    {
        public List<CarrinhoItemQuantidadeDTO> Itens { get; set; } = new();
    }

    public class CarrinhoItemQuantidadeDTO
    {
        public int ItemId { get; set; }

        /// <summary>Quantidade final desejada. Zero remove o item do carrinho.</summary>
        public int Quantidade { get; set; }
    }
}
