namespace glaciar.Application.DTOs.Vendas
{
    public class PedidoItemResponseDTO
    {
        public int Id { get; set; }
        public int EstoqueId { get; set; }
        public int ProdutoId { get; set; }
        public string NomeProduto { get; set; } = string.Empty;
        public string Tamanho { get; set; } = string.Empty;
        public string Cor { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public decimal PrecoUnitario { get; set; }
        public int Quantidade { get; set; }
        public decimal Subtotal { get; set; }
    }
}
