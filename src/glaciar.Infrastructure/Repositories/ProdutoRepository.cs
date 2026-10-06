using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Catalogos;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class ProdutoRepository : IProdutoRepository
    {
        private readonly ApplicationDbContext _context;

        public ProdutoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Produto>> GetVisiveisAsync(string? categoria)
        {
            var query = _context.Produtos
                .AsNoTracking()
                .Include(p => p.Estoques)
                .Where(p => p.Visivel);

            if (!string.IsNullOrWhiteSpace(categoria))
            {
                var nome = categoria.Trim().ToLower();
                query = query.Where(p => p.CategoriasDoProduto.Any(cp => cp.Categoria.Nome.ToLower() == nome));
            }

            return await query.OrderBy(p => p.Id).ToListAsync();
        }

        public async Task<Produto?> GetByIdAsync(int id)
        {
            return await _context.Produtos
                .AsNoTracking()
                .Include(p => p.Estoques)
                .FirstOrDefaultAsync(p => p.Id == id && p.Visivel);
        }
    }
}
