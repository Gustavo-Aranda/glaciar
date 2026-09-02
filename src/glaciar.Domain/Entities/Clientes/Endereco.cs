using System.ComponentModel.DataAnnotations;
using glaciar.Domain.Entities.Vendas;

namespace glaciar.Domain.Entities.Clientes
{
    public class Endereco
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(8)]
        public string Cep { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Logradouro { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Bairro { get; set; } = null!;

        [Required]
        [MaxLength(4)]
        public string Numero { get; set; } = null!;

        [MaxLength(100)]
        public string Complemento { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Cidade { get; set; } = null!;

        [Required]
        [MaxLength(2)]
        public string Estado { get; set; } = null!;

        public ICollection<UsuarioEndereco> UsuariosVinculados { get; set; } = new List<UsuarioEndereco>();
        public ICollection<Pedido> Pedidos { get; set; } = new List<Pedido>();
    }
}