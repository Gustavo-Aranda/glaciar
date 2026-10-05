using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Clientes;

namespace glaciar.Domain.Entities.Vendas
{
    public class Cupom
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Codigo { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ValorDesconto { get; set; }

        [Required]
        public DateTime DataValidade { get; set; }

        [Required]
        public bool Ativo { get; set; }

        [Required]
        public int QuantidadeMaximaUso { get; set; }

        [Required]
        public string CategoriaCupom { get; set; } = null!; // Categoria do cupom (Ex: "Desconto", "Frete Grátis", etc.)

        public int? UsuarioId { get; set; }
        [ForeignKey("UsuarioId")]
        public Usuario? Usuario { get; set; }

        public ICollection<PedidoCupom> PedidosOndeFoiAplicado { get; set; } = new List<PedidoCupom>();
    }
}