using System.ComponentModel.DataAnnotations;

namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>
    /// Abertura de troca/devolução de UM ÚNICO item do pedido.
    /// O pedido é deduzido a partir do <see cref="PedidoProdutoId"/> (restrito ao cliente logado),
    /// portanto o cliente nunca informa o PedidoId nesta operação.
    /// </summary>
    public class SolicitarDevolucaoItemDTO
    {
        [Range(1, int.MaxValue, ErrorMessage = "Informe o item do pedido (pedidoProdutoId).")]
        public int PedidoProdutoId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "A quantidade a devolver deve ser de no mínimo 1.")]
        public int Quantidade { get; set; }

        [Required(ErrorMessage = "Informe o motivo da troca.")]
        [MaxLength(500, ErrorMessage = "O motivo da troca não pode ultrapassar 500 caracteres.")]
        public string Motivo { get; set; } = null!;
    }
}

