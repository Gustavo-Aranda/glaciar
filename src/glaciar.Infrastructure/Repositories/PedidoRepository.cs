using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class PedidoRepository : IPedidoRepository
    {
        private readonly ApplicationDbContext _context;

        public PedidoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Pedido?> GetCarrinhoAsync(int usuarioId)
        {
            return await _context.Pedidos
                .Include(p => p.ProdutosDoPedido)
                    .ThenInclude(i => i.Estoque)
                        .ThenInclude(e => e.Produto)
                .Where(p => p.UsuarioId == usuarioId && p.Status == StatusPedido.EmAberto)
                .OrderByDescending(p => p.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<Pedido?> GetByIdAsync(int usuarioId, int pedidoId)
        {
            return await _context.Pedidos
                .AsNoTracking()
                .AsSplitQuery()
                .Include(p => p.Endereco)
                .Include(p => p.ProdutosDoPedido)
                    .ThenInclude(i => i.Estoque)
                        .ThenInclude(e => e.Produto)
                .Include(p => p.Pagamentos)
                    .ThenInclude(pg => pg.UsuarioCartao)
                        .ThenInclude(uc => uc!.Cartao)
                .Include(p => p.CuponsAplicados)
                    .ThenInclude(pc => pc.Cupom)
                .Include(p => p.Entregas)
                .Include(p => p.Devolucoes)
                .FirstOrDefaultAsync(p =>
                    p.Id == pedidoId &&
                    p.UsuarioId == usuarioId &&
                    p.Status != StatusPedido.EmAberto);
        }

        public async Task<IEnumerable<Pedido>> GetByUsuarioAsync(int usuarioId)
        {
            return await _context.Pedidos
                .AsNoTracking()
                .AsSplitQuery()
                .Include(p => p.Endereco)
                .Include(p => p.ProdutosDoPedido)
                    .ThenInclude(i => i.Estoque)
                        .ThenInclude(e => e.Produto)
                .Include(p => p.Pagamentos)
                    .ThenInclude(pg => pg.UsuarioCartao)
                        .ThenInclude(uc => uc!.Cartao)
                .Include(p => p.CuponsAplicados)
                    .ThenInclude(pc => pc.Cupom)
                .Include(p => p.Entregas)
                .Where(p => p.UsuarioId == usuarioId && p.Status != StatusPedido.EmAberto)
                .OrderByDescending(p => p.Data)
                .ToListAsync();
        }

        public async Task AddAsync(Pedido pedido)
        {
            await _context.Pedidos.AddAsync(pedido);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Pedido pedido)
        {
            // O Pedido já está rastreado (vem de GetCarrinhoAsync). NÃO usamos _context.Update(pedido),
            // pois isso marcaria todo o grafo (Estoque/Produto) como Modified e sobrescreveria
            // a baixa de estoque atômica feita via ExecuteUpdate com valores desatualizados.
            if (_context.Entry(pedido).State == EntityState.Detached)
            {
                _context.Pedidos.Attach(pedido);
                _context.Entry(pedido).State = EntityState.Modified;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // Status é token de concorrência: o UPDATE sai com "WHERE Status = <status lido>".
                // 0 linhas afetadas = outra requisição já moveu o pedido (ex.: dois admins ao mesmo tempo,
                // ou duplo clique em "Trocado" tentando gerar dois cupons).
                throw new ConflitoDeConcorrenciaException(
                    "O pedido foi alterado por outra operação. Recarregue a página e tente novamente.");
            }
        }

        public async Task UpdateAsync(Pedido pedido, IEnumerable<PedidoProduto> itensRemovidos)
        {
            // Marca as exclusões e reaproveita o UpdateAsync: tudo vai para o banco em um único
            // SaveChanges, que o EF Core já envolve em uma transação (tudo ou nada).
            _context.PedidosProdutos.RemoveRange(itensRemovidos);
            await UpdateAsync(pedido);
        }

        public async Task<bool> ExisteComEnderecoAsync(int enderecoId)
        {
            return await _context.Pedidos
                .AnyAsync(p => p.EnderecoId == enderecoId && p.Status != StatusPedido.EmAberto);
        }

        public async Task<IEnumerable<Pedido>> GetAllParaAdminAsync()
        {
            return await _context.Pedidos
                .AsNoTracking()
                .Include(p => p.Usuario)
                .Where(p => p.Status != StatusPedido.EmAberto)
                .OrderByDescending(p => p.Data)
                .ToListAsync();
        }

        public async Task<Pedido?> GetParaAlteracaoStatusAsync(int pedidoId, int? usuarioId = null)
        {
            // Rastreado (sem AsNoTracking): a entidade será modificada por Pedido.AlterarStatus e salva em UpdateAsync.
            var query = _context.Pedidos
                .AsSplitQuery()
                .Include(p => p.ProdutosDoPedido)
                .Include(p => p.Pagamentos)
                .Include(p => p.Entregas)
                .Include(p => p.CuponsAplicados)
                    .ThenInclude(pc => pc.Cupom)
                .Include(p => p.Devolucoes)
                .Where(p => p.Id == pedidoId && p.Status != StatusPedido.EmAberto);

            if (usuarioId.HasValue)
                query = query.Where(p => p.UsuarioId == usuarioId.Value);

            return await query.FirstOrDefaultAsync();
        }

        public async Task<IReadOnlyList<Pedido>> GetCarrinhosVencidosAsync(DateTime agora)
        {
            return await _context.Pedidos
                .Include(p => p.ProdutosDoPedido)
                .Where(p => p.Status == StatusPedido.EmAberto && p.ReservaExpiraEm != null && p.ReservaExpiraEm <= agora)
                .ToListAsync();
        }
    }
}
