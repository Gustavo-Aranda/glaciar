using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace glaciar.Domain.Entities.Catalogos
{
    public class CategoriaProduto
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int CategoriaId { get; set; }

        [Required]
        public int ProdutoId { get; set; }

        [ForeignKey("CategoriaId")]
        public Categoria Categoria { get; set; } = null!;

        [ForeignKey("ProdutoId")]
        public Produto Produto { get; set; } = null!;
    }
}