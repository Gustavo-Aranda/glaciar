using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Clientes;

namespace glaciar.Domain.Entities.Vendas
{
    public class Notificacao
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [ForeignKey("UsuarioId")]
        public Usuario? Usuario { get; set; }

        public int? PedidoId { get; set; }

        [ForeignKey("PedidoId")]
        public Pedido? Pedido { get; set; }

        [Required]
        [MaxLength(300)]
        public string Mensagem { get; set; } = null!;

        public bool Lida { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        public static Notificacao TrocaAutorizada(int usuarioId, int pedidoId, string codigoPedido) => new()
        {
            UsuarioId = usuarioId,
            PedidoId = pedidoId,
            Mensagem = $"Sua solicitação de troca para o pedido {codigoPedido} foi autorizada.",
            Lida = false,
            CreatedAt = DateTime.UtcNow
        };
    }
}
