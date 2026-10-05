using Microsoft.EntityFrameworkCore.Storage;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;
        private IDbContextTransaction? _transacao;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task BeginTransactionAsync()
        {
            if (_transacao != null) return;
            _transacao = await _context.Database.BeginTransactionAsync();
        }

        public async Task CommitAsync()
        {
            if (_transacao == null) return;
            await _transacao.CommitAsync();
            await _transacao.DisposeAsync();
            _transacao = null;
        }

        public async Task RollbackAsync()
        {
            if (_transacao == null) return;
            await _transacao.RollbackAsync();
            await _transacao.DisposeAsync();
            _transacao = null;

            // Descarta entidades pendentes para não vazar estado inválido no mesmo escopo.
            _context.ChangeTracker.Clear();
        }
    }
}
