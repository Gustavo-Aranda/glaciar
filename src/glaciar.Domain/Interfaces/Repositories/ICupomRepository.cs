using glaciar.Domain.Entities.Vendas;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface ICupomRepository
    {
        Task<Cupom?> GetByCodigoAsync(string codigo);

        Task<IReadOnlyList<Cupom>> GetByCodigosAsync(IEnumerable<string> codigos);

        Task<IEnumerable<Cupom>> GetTrocaDisponiveisByUsuarioAsync(int usuarioId);

        Task<IEnumerable<Cupom>> GetDisponiveisByUsuarioAsync(int usuarioId);

        Task AddAsync(Cupom cupom);
    }
}
