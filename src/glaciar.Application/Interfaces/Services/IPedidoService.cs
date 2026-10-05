using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface IPedidoService
    {
        Task<IEnumerable<PedidoResponseDTO>> ListarPorUsuarioAsync(int usuarioId);
        Task<PedidoResponseDTO> ObterAsync(int usuarioId, int pedidoId);
    }
}
