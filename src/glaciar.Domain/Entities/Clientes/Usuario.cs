using System.ComponentModel.DataAnnotations;

namespace glaciar.Domain.Entities.Clientes
{
    public class Usuario
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Sobrenome { get; set; } = null!;

        [Required]
        [MaxLength(11)]
        public string Cpf { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Email { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Senha_hash { get; set; } = null!;

        [Required]
        [MaxLength(3)]
        public string Tipo_usuario { get; set; } = null!;

        public ICollection<UsuarioCartao> CartoesVinculados { get; set; } = new List<UsuarioCartao>();
        public ICollection<UsuarioEndereco> EnderecosVinculados { get; set; } = new List<UsuarioEndereco>();
    }
}