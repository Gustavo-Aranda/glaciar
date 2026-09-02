using System.ComponentModel.DataAnnotations;

namespace glaciar.Domain.Entities.Catalogos
{
    public class Categoria
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Nome { get; set; } = null!;

        public ICollection<CategoriaProduto> CategoriasProdutos { get; set; } = new List<CategoriaProduto>();
    }
}