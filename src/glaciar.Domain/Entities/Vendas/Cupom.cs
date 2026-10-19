using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.Domain.Entities.Vendas
{
    public class Cupom
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Codigo { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ValorDesconto { get; set; }

        [Required]
        public DateTime DataValidade { get; set; }

        [Required]
        public bool Ativo { get; set; }

        [Required]
        public int QuantidadeMaximaUso { get; set; }

        [Required]
        public string CategoriaCupom { get; set; } = null!; // Categoria do cupom (Ex: "Desconto", "Frete Grátis", etc.)

        public int? UsuarioId { get; set; }
        [ForeignKey("UsuarioId")]
        public Usuario? Usuario { get; set; }

        public ICollection<PedidoCupom> PedidosOndeFoiAplicado { get; set; } = new List<PedidoCupom>();

        /// <summary>Cupom de troca (crédito pessoal do cliente). Tudo que não é troca é promocional.</summary>
        [NotMapped]
        public bool EhTroca =>
            string.Equals(CategoriaCupom, CategoriasCupom.Troca, StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// Fábrica única de cupons de troca — usada tanto no troco do checkout quanto na conclusão
        /// de uma troca (status Trocado). Cupom pessoal, uso único, validade de 1 ano.
        /// </summary>
        public static Cupom CriarCupomTroca(int usuarioId, decimal valor)
        {
            if (valor <= 0m)
                throw new DomainValidationException("O valor do cupom de troca deve ser maior que zero.");

            return new Cupom
            {
                Codigo = $"TROCA-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                ValorDesconto = Math.Round(valor, 2, MidpointRounding.AwayFromZero),
                DataValidade = DateTime.UtcNow.AddYears(1),
                CategoriaCupom = CategoriasCupom.Troca,
                Ativo = true,
                QuantidadeMaximaUso = 1,
                UsuarioId = usuarioId
            };
        }
    }
}