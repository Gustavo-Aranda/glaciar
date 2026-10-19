using System.ComponentModel.DataAnnotations;
using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>Corpo do PATCH de status (admin e cliente usam o mesmo contrato).</summary>
    public class AlterarStatusPedidoDTO
    {
        /// <summary>
        /// Nullable + [Required]: um corpo sem "status" é rejeitado com 400, em vez de cair
        /// silenciosamente no valor default do enum (EmAberto).
        /// </summary>
        [Required(ErrorMessage = "Informe o novo status do pedido.")]
        public StatusPedido? Status { get; set; }
    }
}
