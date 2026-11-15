using glaciar.Application.DTOs.Clientes;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Clientes
{
    public class NotificacaoService : INotificacaoService
    {
        private readonly INotificacaoRepository _notificacaoRepository;

        public NotificacaoService(INotificacaoRepository notificacaoRepository)
        {
            _notificacaoRepository = notificacaoRepository;
        }

        public async Task<IEnumerable<NotificacaoResponseDTO>> ListarPorUsuarioAsync(int usuarioId)
        {
            var notificacoes = await _notificacaoRepository.GetByUsuarioAsync(usuarioId);
            return notificacoes.Select(ClientesMapper.ParaNotificacao).ToList();
        }

        public async Task MarcarComoLidaAsync(int usuarioId, int notificacaoId)
        {
            await _notificacaoRepository.MarcarComoLidaAsync(usuarioId, notificacaoId);
        }
    }
}
