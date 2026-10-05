using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Catalogos;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class EstoqueRepository : IEstoqueRepository
    {
        private readonly ApplicationDbContext _context;

        public EstoqueRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Estoque?> GetByIdComProdutoAsync(int estoqueId)
        {
            return await _context.Estoques
                .Include(e => e.Produto)
                .FirstOrDefaultAsync(e => e.Id == estoqueId);
        }

        public async Task<bool> BaixarEstoqueAsync(int estoqueId, int quantidade)
        {
            var agora = DateTime.UtcNow;

            // UPDATE condicional: só decrementa se ainda houver saldo no instante da baixa.
            // Evita overselling mesmo com duas compras concorrentes do mesmo SKU.
            var linhasAfetadas = await _context.Estoques
                .Where(e => e.Id == estoqueId && e.Quantidade >= quantidade)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(e => e.Quantidade, e => e.Quantidade - quantidade)
                    .SetProperty(e => e.UpdatedAt, agora));

            return linhasAfetadas == 1;
        }
    }
}
