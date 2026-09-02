using System.ComponentModel.DataAnnotations;

namespace glaciar.Domain.Entities.Clientes
{
    public class Cartao
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(4)]
        public string Ultimos_digitos { get; set; } = null!;

        [Required]
        [MaxLength(20)]
        public string Bandeira { get; set; } = null!;

        public ICollection<UsuarioCartao> UsuariosVinculados { get; set; } = new List<UsuarioCartao>();
    }
}