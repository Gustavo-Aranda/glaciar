using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace glaciar.Domain.Entities.Vendas
{
    public class PedidoCupom
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PedidoId { get; set; }
        [ForeignKey("PedidoId")]
        public Pedido Pedido { get; set; } = null!;

        [Required]
        public int CupomId { get; set; }
        [ForeignKey("CupomId")]
        public Cupom Cupom { get; set; } = null!;
    }
}
