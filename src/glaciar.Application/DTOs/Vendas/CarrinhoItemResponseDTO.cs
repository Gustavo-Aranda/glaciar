namespace glaciar.Application.DTOs.Vendas
{
    public class CarrinhoItemResponseDTO
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

        /// <summary>Saldo físico atual do SKU (para o front limitar o seletor de quantidade).</summary>
        public int EstoqueDisponivel { get; set; }

        /// <summary>False se o produto ficou invisível ou se o estoque ficou abaixo da quantidade do carrinho.</summary>
        public bool Disponivel { get; set; }
    }
}
