using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class UsuarioEnderecoRepository : IUsuarioEnderecoRepository
    {
        private readonly ApplicationDbContext _context;

        public UsuarioEnderecoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<UsuarioEndereco?> GetByIdAsync(int id)
        {
            return await _context.UsuariosEnderecos
                .Include(ue => ue.Endereco)
                .FirstOrDefaultAsync(ue => ue.Id == id);
        }

        public async Task<IEnumerable<UsuarioEndereco>> GetAtivosByUsuarioIdAsync(int usuarioId)
        {
            return await _context.UsuariosEnderecos
                .Include(ue => ue.Endereco)
                .Where(ue => ue.UsuarioId == usuarioId && ue.Ativo)
                .ToListAsync();
        }

        public async Task AddAsync(UsuarioEndereco usuarioEndereco)
        {
            await _context.UsuariosEnderecos.AddAsync(usuarioEndereco);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(UsuarioEndereco usuarioEndereco)
        {
            _context.UsuariosEnderecos.Update(usuarioEndereco);
            await _context.SaveChangesAsync();
        }

        public async Task RemoverPadraoDoUsuarioAsync(int usuarioId)
        {
            // Busca todos os endereços do usuário que estão marcados como padrão e ativos
            var enderecosPadrao = await _context.UsuariosEnderecos
                .Where(ue => ue.UsuarioId == usuarioId && ue.Padrao && ue.Ativo)
                .ToListAsync();

            if (enderecosPadrao.Any())
            {
                foreach (var vinculo in enderecosPadrao)
                {
                    vinculo.Padrao = false;
                }
                
                _context.UsuariosEnderecos.UpdateRange(enderecosPadrao);
                await _context.SaveChangesAsync();
            }
        }
    }
}