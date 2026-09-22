using glaciar.Domain.Entities.Clientes;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface ICartaoRepository
    {
        Task<IEnumerable<UsuarioCartao>> GetAtivosByUsuarioIdAsync(int usuarioId);
        Task<UsuarioCartao?> GetByIdAsync(int usuarioId, int usuarioCartaoId);
        Task AddAsync(UsuarioCartao usuarioCartao);
        Task UpdateAsync(UsuarioCartao usuarioCartao);
        Task RemoverPadraoDoUsuarioAsync(int usuarioId);
    }
}