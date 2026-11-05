using System.ComponentModel.DataAnnotations;

namespace glaciar.Application.DTOs.Vendas
{
    public class ItemTrocaDTO
    {
        /// <summary>Id da LINHA do pedido (PedidoProduto) — nunca o Id do Pedido, do Produto ou do Estoque.</summary>
        [Range(1, int.MaxValue, ErrorMessage = "O item do pedido (pedidoProdutoId) é obrigatório.")]
        public int PedidoProdutoId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "A quantidade de unidades a trocar deve ser de no mínimo 1.")]
        public int Quantidade { get; set; }
    }

    /// <summary>
    /// Solicitação de troca em lote (vários itens de um mesmo pedido).
    /// A troca do pedido inteiro só acontece com opt-in EXPLÍCITO (<see cref="TrocarPedidoInteiro"/> = true);
    /// uma lista vazia/ausente NÃO é mais interpretada como "todos os itens".
    /// </summary>
    public class SolicitarTrocaDTO : IValidatableObject
    {
        /// <summary>Itens (PedidoProduto) e unidades específicas para troca. Obrigatório quando TrocarPedidoInteiro = false.</summary>
        public List<ItemTrocaDTO>? Itens { get; set; }

        /// <summary>Opt-in explícito para trocar todas as unidades de todos os itens do pedido.</summary>
        public bool TrocarPedidoInteiro { get; set; }

        [Required(ErrorMessage = "Informe o motivo da troca.")]
        [MaxLength(500, ErrorMessage = "O motivo da troca não pode ultrapassar 500 caracteres.")]
        public string Motivo { get; set; } = null!;

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var possuiItens = Itens is { Count: > 0 };

            if (!TrocarPedidoInteiro && !possuiItens)
            {
                yield return new ValidationResult(
                    "Selecione ao menos um item do pedido para trocar.",
                    new[] { nameof(Itens) });
            }

            if (TrocarPedidoInteiro && possuiItens)
            {
                yield return new ValidationResult(
                    "Informe itens específicos OU marque a troca do pedido inteiro, não ambos.",
                    new[] { nameof(Itens), nameof(TrocarPedidoInteiro) });
            }
        }
    }
}
