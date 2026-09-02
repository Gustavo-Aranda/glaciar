using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Clientes;

namespace glaciar.Domain.Entities.Vendas
{
    public class Pagamento
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Valor { get; set; }

        [Required]
        [MaxLength(100)]
        public string Status { get; set; } = null!;

        [Required]
        public int PedidoId { get; set; }
        [ForeignKey("PedidoId")]
        public Pedido Pedido { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Metodo { get; set; } = null!;

        [Required]
        public DateOnly Data { get; set; }

        public int? QuantidadeParcelas { get; set; }
        public UsuarioCartao? Cartao { get; set; }
        [ForeignKey("Cartao")]
        public int? CartaoId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}