using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Catalogos.Enum;

namespace glaciar.Domain.Entities.Catalogos
{
    public class Produto
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string Descricao { get; set; } = null!;

        [Required]
        public TipoProduto Tipo { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Preco { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        public ICollection<Estoque> Estoques { get; set; } = new List<Estoque>();
        public ICollection<CategoriaProduto> CategoriasDoProduto { get; set; } = new List<CategoriaProduto>();
    }
}