using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace glaciar.Domain.Entities.Vendas
{
    public class PedidoProduto
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PedidoId { get; set; }

        [ForeignKey("PedidoId")]
        public Pedido Pedido { get; set; } = null!;

        [Required]
        public int EstoqueId { get; set; }

        [ForeignKey("EstoqueId")]
        public Catalogos.Estoque Estoque { get; set; } = null!;

        [Required]
        public int Quantidade { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Preco { get; set; }

    }
}