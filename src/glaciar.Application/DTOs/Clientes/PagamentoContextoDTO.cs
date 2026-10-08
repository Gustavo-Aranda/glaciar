using glaciar.Application.DTOs.Clientes;
using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.DTOs.Clientes
{
    public class PagamentoContextoDTO
    {
        public IEnumerable<CartaoResponseDTO> Cartoes { get; set; } = new List<CartaoResponseDTO>();
        public IEnumerable<CupomResponseDTO> Cupons { get; set; } = new List<CupomResponseDTO>();
    }
}
