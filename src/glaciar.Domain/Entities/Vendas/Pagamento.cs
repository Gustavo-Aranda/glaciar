using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Vendas.Enum;

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
        public StatusPagamento Status { get; set; }

        [Required]
        public int PedidoId { get; set; }
        [ForeignKey("PedidoId")]
        public Pedido Pedido { get; set; } = null!;

        [Required]
        public MetodoPagamento Metodo { get; set; }

        [Required]
        public DateOnly Data { get; set; }

        public int? QuantidadeParcelas { get; set; }
        public int? UsuarioCartaoId { get; set; }
        [ForeignKey("UsuarioCartaoId")]
        public UsuarioCartao? UsuarioCartao { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}