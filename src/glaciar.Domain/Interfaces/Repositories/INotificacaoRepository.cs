using glaciar.Domain.Entities.Vendas;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface INotificacaoRepository
    {
        Task AddAsync(Notificacao notificacao);
        Task<IEnumerable<Notificacao>> GetByUsuarioAsync(int usuarioId);
        Task MarcarComoLidaAsync(int usuarioId, int notificacaoId);
    }
}
