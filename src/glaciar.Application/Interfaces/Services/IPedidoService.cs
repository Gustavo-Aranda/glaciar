using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface IPedidoService
    {
        Task<IEnumerable<PedidoResponseDTO>> ObterPedidosDoUsuarioAsync(int usuarioId);
        Task<PedidoResponseDTO?> ObterPedidoPorIdAsync(int usuarioId, int pedidoId);
    }
}
