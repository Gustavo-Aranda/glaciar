using System.ComponentModel.DataAnnotations;

namespace glaciar.Application.DTOs.Vendas
{
    public class ItemTrocaDTO
    {
        [Required(ErrorMessage = "O item do pedido é obrigatório.")]
        public int PedidoProdutoId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "A quantidade de unidades a trocar deve ser de no mínimo 1.")]
        public int Quantidade { get; set; }
    }

    public class SolicitarTrocaDTO
    {
        /// <summary>
        /// Itens e unidades específicas para troca. Se for nulo ou vazio, a troca será solicitada
        /// para todas as unidades de todos os itens do pedido (pedido inteiro).
        /// </summary>
        public List<ItemTrocaDTO>? Itens { get; set; }

        [Required(ErrorMessage = "Informe o motivo da troca.")]
        [MaxLength(500, ErrorMessage = "O motivo da troca não pode ultrapassar 500 caracteres.")]
        public string Motivo { get; set; } = null!;
    }
}
