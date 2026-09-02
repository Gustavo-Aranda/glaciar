using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Logisticas;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Domain.Entities.Vendas
{
    public class Pedido
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ValorTotal { get; set; }

        [Required]
        public string Codigo { get; set; } = null!;

        [Required]
        public DateTime Data { get; set; }

        [Required]
        public StatusPedido Status { get; set; }


        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [Required]
        public int UsuarioId { get; set; }
        [ForeignKey("UsuarioId")]
        public Usuario Usuario { get; set; } = null!;

        [Required]
        public int EnderecoId { get; set; }
        [ForeignKey("EnderecoId")]
        public Endereco Endereco { get; set; } = null!;
        
        public int? CupomId { get; set; }
        [ForeignKey("CupomId")]
        public Cupom? Cupom { get; set; }

        public ICollection<PedidoProduto> ProdutosDoPedido { get; set; } = new List<PedidoProduto>();
        public ICollection<Pagamento> Pagamentos { get; set; } = new List<Pagamento>();
        public ICollection<Entrega> Entregas { get; set; } = new List<Entrega>();
        public ICollection<Devolucao> Devolucoes { get; set; } = new List<Devolucao>();
    }
}