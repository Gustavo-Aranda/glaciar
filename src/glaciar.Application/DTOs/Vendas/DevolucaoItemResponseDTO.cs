using glaciar.Domain.Entities.Logisticas.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>Item efetivamente incluído em uma solicitação de troca (um registro de Devolucao).</summary>
    public class DevolucaoItemResponseDTO
    {
        public int Id { get; set; }
        public int PedidoProdutoId { get; set; }
        public int ProdutoId { get; set; }
        public string NomeProduto { get; set; } = string.Empty;
        public string Tamanho { get; set; } = string.Empty;
        public string Cor { get; set; } = string.Empty;
        public decimal PrecoUnitario { get; set; }

        /// <summary>Unidades devolvidas (pode ser menor que a quantidade comprada).</summary>
        public int Quantidade { get; set; }

        /// <summary>Crédito rateado que será convertido em cupom de troca.</summary>
        public decimal Valor { get; set; }

        public string Motivo { get; set; } = string.Empty;
        public StatusDevolucao Status { get; set; }
        public DateTime DataDevolucao { get; set; }
    }
}

