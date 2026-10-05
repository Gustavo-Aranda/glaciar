using glaciar.Application.DTOs.Enderecos;
using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    public class PedidoResponseDTO
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public DateTime Data { get; set; }
        public StatusPedido Status { get; set; }

        public decimal Subtotal { get; set; }
        public decimal ValorFrete { get; set; }

        /// <summary>Subtotal + Frete (valor bruto do pedido).</summary>
        public decimal ValorTotal { get; set; }

        /// <summary>Quanto dos cupons foi efetivamente abatido (limitado ao ValorTotal).</summary>
        public decimal ValorAbatidoCupons { get; set; }

        /// <summary>Soma cobrada nos cartões.</summary>
        public decimal ValorPagoCartoes { get; set; }

        public EnderecoResponseDTO? EnderecoEntrega { get; set; }
        public List<PedidoItemResponseDTO> Itens { get; set; } = new();
        public List<PagamentoResponseDTO> Pagamentos { get; set; } = new();
        public List<CupomResponseDTO> CuponsAplicados { get; set; } = new();

        /// <summary>Preenchido somente na resposta do checkout, quando os cupons excedem o total.</summary>
        public CupomResponseDTO? CupomTrocaGerado { get; set; }
    }
}
