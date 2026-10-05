using glaciar.Application.DTOs.Vendas;
using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.Interfaces.Services
{
    public interface ICarrinhoService
    {
        Task<CarrinhoResponseDTO> ObterAsync(int usuarioId);
        Task<CarrinhoResponseDTO> AdicionarItemAsync(int usuarioId, CarrinhoItemAddDTO dto);
        Task<CarrinhoResponseDTO> AtualizarItemAsync(int usuarioId, int itemId, CarrinhoItemUpdateDTO dto);
        Task<CarrinhoResponseDTO> RemoverItemAsync(int usuarioId, int itemId);
        Task<FreteResponseDTO> CalcularFreteAsync(int usuarioId, Estados estado);
    }
}
