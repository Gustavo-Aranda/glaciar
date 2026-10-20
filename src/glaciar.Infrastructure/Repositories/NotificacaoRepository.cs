using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class NotificacaoRepository : INotificacaoRepository
    {
        private readonly ApplicationDbContext _context;

        public NotificacaoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Notificacao notificacao)
        {
            await _context.Notificacoes.AddAsync(notificacao);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Notificacao>> GetByUsuarioAsync(int usuarioId)
        {
            return await _context.Notificacoes
                .AsNoTracking()
                .Where(n => n.UsuarioId == usuarioId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        public async Task MarcarComoLidaAsync(int usuarioId, int notificacaoId)
        {
            await _context.Notificacoes
                .Where(n => n.Id == notificacaoId && n.UsuarioId == usuarioId)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.Lida, true));
        }
    }
}
