using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class EnderecoRepository : IEnderecoRepository
    {
        private readonly ApplicationDbContext _context;

        public EnderecoRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Endereco?> GetByIdAsync(int id)
        {
            return await _context.Enderecos.FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<Endereco?> BuscarPorCepENumeroAsync(string cep, string numero)
        {
            return await _context.Enderecos
                .FirstOrDefaultAsync(e => e.Cep == cep && e.Numero == numero);
        }

        public async Task AddAsync(Endereco endereco)
        {
            await _context.Enderecos.AddAsync(endereco);
            // O SaveChangesAsync gera o ID do endereço físico no banco instantaneamente
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Endereco endereco)
        {
            _context.Enderecos.Update(endereco);
            await _context.SaveChangesAsync();
        }
    }
}