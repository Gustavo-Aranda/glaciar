using glaciar.Application.DTOs.Vendas;
using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.Interfaces.Services
{
    public interface ICarrinhoService
    {
        Task<CarrinhoResponseDTO> ObterAsync(int usuarioId);
        Task<CarrinhoResponseDTO> AdicionarItemAsync(int usuarioId, CarrinhoItemAddDTO dto);
        /// <summary>
        /// Aplica, de forma atômica, as quantidades finais definidas no carrinho (0 = remover)
        /// e devolve o carrinho com os preços oficiais recalculados no servidor.
        /// </summary>
        Task<CarrinhoResponseDTO> SincronizarItensAsync(int usuarioId, CarrinhoSincronizarDTO dto);
        Task<FreteResponseDTO> CalcularFreteAsync(int usuarioId, Estados estado);
    }
}
