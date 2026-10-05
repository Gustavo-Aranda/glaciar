using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    public class PagamentoResponseDTO
    {
        public int Id { get; set; }
        public decimal Valor { get; set; }
        public MetodoPagamento Metodo { get; set; }
        public StatusPagamento Status { get; set; }
        public int? UsuarioCartaoId { get; set; }
        public string? CartaoUltimosDigitos { get; set; }
        public string? CartaoBandeira { get; set; }
    }
}
