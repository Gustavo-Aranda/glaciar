using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    public class FreteResponseDTO
    {
        public Estados Estado { get; set; }
        public int QuantidadeItens { get; set; }
        public decimal Valor { get; set; }
    }
}
