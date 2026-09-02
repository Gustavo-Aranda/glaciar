using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace glaciar.Domain.Entities.Clientes
{
    public class UsuarioCartao
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [ForeignKey("UsuarioId")]
        public Usuario Usuario { get; set; } = null!;

        [Required]
        public int CartaoId { get; set; }

        [ForeignKey("CartaoId")]
        public Cartao Cartao { get; set; } = null!;

        [Required]
        public bool Padrao { get; set; }
    }
}