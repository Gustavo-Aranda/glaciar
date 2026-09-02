using System.ComponentModel.DataAnnotations;
using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Domain.Entities.Clientes
{
    public class Cartao
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(4)]
        public string UltimosDigitos { get; set; } = null!;

        [Required]
        public BandeiraCartao Bandeira { get; set; }

        public ICollection<UsuarioCartao> UsuariosVinculados { get; set; } = new List<UsuarioCartao>();
    }
}