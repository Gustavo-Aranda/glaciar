using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Logisticas.Enum;

namespace glaciar.Domain.Entities.Logisticas
{
    public class Devolucao
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime DataDevolucao { get; set; }

        [Required]
        [MaxLength(500)]
        public string Motivo { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Valor { get; set; }

        [MaxLength(50)]
        public string? CodigoReverso { get; set; }
        
        [MaxLength(50)]
        public string? CodigoRastreioRetorno { get; set; }

        [Required]
        public int PedidoProdutoId { get; set; }
        [ForeignKey("PedidoProdutoId")]
        public PedidoProduto PedidoProduto { get; set; } = null!;

        [Required]
        public StatusDevolucao Status { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
        [Required]
        public DateTime UpdatedAt { get; set; }
    }
}