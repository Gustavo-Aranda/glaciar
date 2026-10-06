using glaciar.Domain.Entities.Vendas;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface ICupomRepository
    {
        Task<Cupom?> GetByCodigoAsync(string codigo);

        Task<IEnumerable<Cupom>> GetTrocaDisponiveisByUsuarioAsync(int usuarioId);

        Task<IEnumerable<Cupom>> GetDisponiveisByUsuarioAsync(int usuarioId);

        Task<bool> ExisteCodigoAsync(string codigo);

        Task AddAsync(Cupom cupom);
    }
}
