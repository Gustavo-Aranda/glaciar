using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class CupomRepository : ICupomRepository
    {
        private readonly ApplicationDbContext _context;

        public CupomRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Cupom?> GetByCodigoAsync(string codigo)
        {
            var codigoNormalizado = codigo.Trim().ToUpper();
            return await _context.Cupons
                .FirstOrDefaultAsync(c => c.Codigo.ToUpper() == codigoNormalizado);
        }

        public async Task<IEnumerable<Cupom>> GetTrocaDisponiveisByUsuarioAsync(int usuarioId)
        {
            var agora = DateTime.UtcNow;
            return await _context.Cupons
                .AsNoTracking()
                .Where(c =>
                    c.UsuarioId == usuarioId &&
                    c.CategoriaCupom == CategoriasCupom.Troca &&
                    c.Ativo &&
                    c.QuantidadeMaximaUso > 0 &&
                    c.DataValidade >= agora)
                .OrderBy(c => c.DataValidade)
                .ToListAsync();
        }

        public async Task<IEnumerable<Cupom>> GetDisponiveisByUsuarioAsync(int usuarioId)
        {
            var agora = DateTime.UtcNow;
            return await _context.Cupons
                .AsNoTracking()
                .Where(c =>
                    (c.UsuarioId == usuarioId || (c.UsuarioId == null && c.CategoriaCupom != CategoriasCupom.Troca)) &&
                    c.Ativo &&
                    c.QuantidadeMaximaUso > 0 &&
                    c.DataValidade >= agora)
                .OrderByDescending(c => c.CategoriaCupom == CategoriasCupom.Troca)
                .ThenBy(c => c.DataValidade)
                .ToListAsync();
        }

        public async Task<bool> ExisteCodigoAsync(string codigo)
        {
            var codigoNormalizado = codigo.Trim().ToUpper();
            return await _context.Cupons.AnyAsync(c => c.Codigo.ToUpper() == codigoNormalizado);
        }

        public async Task AddAsync(Cupom cupom)
        {
            await _context.Cupons.AddAsync(cupom);
            await _context.SaveChangesAsync();
        }
    }
}
