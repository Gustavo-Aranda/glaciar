using System.ComponentModel.DataAnnotations;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Clientes.Enum;

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
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = null!;

        [Required]
        [MaxLength(11)]
        public string Telefone { get; set; } = null!;

        [Required]
        [MaxLength(255)]
        public string SenhaHash { get; set; } = null!;

        [Required]
        public TipoUsuario TipoUsuario { get; set; }

        public bool Ativo { get; set; } = true;
        public DateTime DataCadastro { get; set; } = DateTime.UtcNow;

        public ICollection<UsuarioCartao> CartoesVinculados { get; set; } = new List<UsuarioCartao>();
        public ICollection<UsuarioEndereco> EnderecosVinculados { get; set; } = new List<UsuarioEndereco>();
        public ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
    }
}