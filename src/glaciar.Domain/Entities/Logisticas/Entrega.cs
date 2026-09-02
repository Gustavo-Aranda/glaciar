using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Logisticas.Enum;

namespace glaciar.Domain.Entities.Logisticas
{
    public class Entrega
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ValorFrete { get; set; }

        [Required]
        [MaxLength(100)]
        public string CodigoRastreamento { get; set; } = null!;

        [Required]
        public StatusEntrega Status { get; set; }

        public DateTime? DataDespacho { get; set; }
        public DateTime? DataEntrega { get; set; }

        [Required]
        public int PedidoId { get; set; }
        [ForeignKey("PedidoId")]
        public Pedido Pedido { get; set; } = null!;

        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}