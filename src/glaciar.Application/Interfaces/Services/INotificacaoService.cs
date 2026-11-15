using glaciar.Application.DTOs.Clientes;

namespace glaciar.Application.Interfaces.Services
{
    public interface INotificacaoService
    {
        Task<IEnumerable<NotificacaoResponseDTO>> ListarPorUsuarioAsync(int usuarioId);
        Task MarcarComoLidaAsync(int usuarioId, int notificacaoId);
    }
}
