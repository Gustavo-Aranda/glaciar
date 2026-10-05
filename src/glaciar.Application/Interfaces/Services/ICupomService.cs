using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface ICupomService
    {
        /// <summary>Valida se o cupom pode ser usado pelo cliente (pré-visualização no carrinho).</summary>
        Task<CupomResponseDTO> ValidarAsync(int usuarioId, string codigo);

        /// <summary>Cupons de troca disponíveis do cliente.</summary>
        Task<IEnumerable<CupomResponseDTO>> ListarCuponsDeTrocaAsync(int usuarioId);
    }
}
