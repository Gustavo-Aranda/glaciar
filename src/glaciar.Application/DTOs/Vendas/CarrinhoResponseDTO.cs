namespace glaciar.Application.DTOs.Vendas
{
    public class CarrinhoResponseDTO
    {
        /// <summary>Id do Pedido "EmAberto" que representa o carrinho. Null se o carrinho ainda não existe.</summary>
        public int? PedidoId { get; set; }
        public List<CarrinhoItemResponseDTO> Itens { get; set; } = new();
        public int QuantidadeItens { get; set; }
        public decimal Subtotal { get; set; }

        /// <summary>True se algum item precisa de ajuste antes do checkout.</summary>
        public bool PossuiItensIndisponiveis { get; set; }
    }
}
