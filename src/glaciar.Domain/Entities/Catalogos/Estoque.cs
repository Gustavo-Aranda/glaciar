using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Vendas;

namespace glaciar.Domain.Entities.Catalogos
{
    public class Estoque
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(10)]
        public string Tamanho { get; set; } = null!; //Tamanho do produto (PP, P, M, G, GG, 36, 37, 38, 39, 40, 41, 42)

        [Required]
        [MaxLength(30)]
        public string Cor { get; set; } = null!;

        [Required]
        public int Quantidade { get; set; }

        
        [Required]
        [MaxLength(100)]
        public string SKU { get; set; } = null!; //SKU do produto (Stock Keeping Unit)

        [Required]
        public int ProdutoId { get; set; }
        [ForeignKey("ProdutoId")]
        public Produto Produto { get; set; } = null!;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        public ICollection<PedidoProduto> PedidosDeProdutos { get; set; } = new List<PedidoProduto>();
    }
}