using glaciar.Domain.Entities.Clientes; 

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IUsuarioEnderecoRepository
    {
        Task<UsuarioEndereco?> GetByIdAsync(int id);
        Task<IEnumerable<UsuarioEndereco>> GetAtivosByUsuarioIdAsync(int usuarioId);
        Task AddAsync(UsuarioEndereco usuarioEndereco);
        Task UpdateAsync(UsuarioEndereco usuarioEndereco); 
        Task RemoverPadraoDoUsuarioAsync(int usuarioId);
    }
}