using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface IPedidoService
    {
        Task<IEnumerable<PedidoResponseDTO>> ObterPedidosDoUsuarioAsync(int usuarioId);
        Task<PedidoResponseDTO?> ObterPedidoPorIdAsync(int usuarioId, int pedidoId);

        /// <summary>Todos os pedidos finalizados, com os próximos status permitidos ao administrador.</summary>
        Task<IEnumerable<PedidoAdminResumoDTO>> ListarParaAdminAsync();
    }
}
