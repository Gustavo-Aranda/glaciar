using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Catalogos;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class RelatorioVendasRepository : IRelatorioVendasRepository
    {
        private readonly ApplicationDbContext _context;

        public RelatorioVendasRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<Categoria>> ObterCategoriasAsync()
        {
            return await _context.Categorias
                .AsNoTracking()
                .OrderBy(c => c.Nome)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Categoria>> ObterCategoriasPorFiltroAsync(
            IReadOnlyCollection<int> ids,
            IReadOnlyCollection<string> nomes)
        {
            var query = _context.Categorias.AsNoTracking();

            if (ids.Count > 0 && nomes.Count > 0)
            {
                query = query.Where(c => ids.Contains(c.Id) || nomes.Contains(c.Nome.ToLower()));
            }
            else if (ids.Count > 0)
            {
                query = query.Where(c => ids.Contains(c.Id));
            }
            else if (nomes.Count > 0)
            {
                query = query.Where(c => nomes.Contains(c.Nome.ToLower()));
            }
            else
            {
                return Array.Empty<Categoria>();
            }

            return await query
                .OrderBy(c => c.Nome)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<VendaMensalCategoriaProjection>> ObterVendasEntreguesPorCategoriaEMesAsync(
            DateTime dataInicioUtc,
            DateTime dataFimUtc,
            IReadOnlyCollection<int> categoriaIds)
        {
            if (categoriaIds.Count == 0)
            {
                return Array.Empty<VendaMensalCategoriaProjection>();
            }

            return await (
                from pp in _context.PedidosProdutos.AsNoTracking()
                join p in _context.Pedidos.AsNoTracking() on pp.PedidoId equals p.Id
                join e in _context.Estoques.AsNoTracking() on pp.EstoqueId equals e.Id
                join cp in _context.CategoriasProdutos.AsNoTracking() on e.ProdutoId equals cp.ProdutoId
                join c in _context.Categorias.AsNoTracking() on cp.CategoriaId equals c.Id
                where p.Status == StatusPedido.Entregue
                   && p.Data >= dataInicioUtc
                   && p.Data <= dataFimUtc
                   && categoriaIds.Contains(c.Id)
                group new { pp.Preco, pp.Quantidade } by new
                {
                    CategoriaId = c.Id,
                    CategoriaNome = c.Nome,
                    Ano = p.Data.Year,
                    Mes = p.Data.Month
                } into g
                select new VendaMensalCategoriaProjection(
                    g.Key.CategoriaId,
                    g.Key.CategoriaNome,
                    g.Key.Ano,
                    g.Key.Mes,
                    g.Sum(x => x.Preco * x.Quantidade)
                )
            ).ToListAsync();
        }
    }
}

