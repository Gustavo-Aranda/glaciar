using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class CartaoRepository : ICartaoRepository
    {
        private readonly ApplicationDbContext _context;

        public CartaoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UsuarioCartao>> GetAtivosByUsuarioIdAsync(int usuarioId)
        {
            return await _context.UsuariosCartoes
                .AsNoTracking()
                .Include(uc => uc.Cartao)
                .Where(uc => uc.UsuarioId == usuarioId && uc.Ativo)
                .OrderByDescending(uc => uc.Padrao)
                .ThenBy(uc => uc.Id)
                .ToListAsync();
        }

        public async Task<UsuarioCartao?> GetByIdAsync(int usuarioId, int usuarioCartaoId)
        {
            return await _context.UsuariosCartoes
                .Include(uc => uc.Cartao)
                .FirstOrDefaultAsync(uc => uc.UsuarioId == usuarioId && uc.Id == usuarioCartaoId);
        }

        public async Task AddAsync(UsuarioCartao usuarioCartao)
        {
            await _context.UsuariosCartoes.AddAsync(usuarioCartao);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(UsuarioCartao usuarioCartao)
        {
            _context.UsuariosCartoes.Update(usuarioCartao);
            await _context.SaveChangesAsync();
        }

        public async Task RemoverPadraoDoUsuarioAsync(int usuarioId)
        {
            var cartoesPadrao = await _context.UsuariosCartoes
                .Where(uc => uc.UsuarioId == usuarioId && uc.Padrao && uc.Ativo)
                .ToListAsync();

            if (!cartoesPadrao.Any()) return;

            foreach (var cartao in cartoesPadrao)
            {
                cartao.Padrao = false;
            }

            await _context.SaveChangesAsync();
        }
    }
}
