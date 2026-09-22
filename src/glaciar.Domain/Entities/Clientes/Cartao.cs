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

        [Required]
        [Range(1, 12)]
        public int MesValidade { get; set; }

        [Required]
        [Range(2000, 9999)]
        public int AnoValidade { get; set; }

        public ICollection<UsuarioCartao> UsuariosVinculados { get; set; } = new List<UsuarioCartao>();
    }
}