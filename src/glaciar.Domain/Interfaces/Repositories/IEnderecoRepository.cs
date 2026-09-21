using glaciar.Domain.Entities.Clientes;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IEnderecoRepository
    {
        Task<Endereco?> GetByIdAsync(int id);
        Task<Endereco?> BuscarPorCepENumeroAsync(string cep, string numero);
        Task AddAsync(Endereco endereco);
        Task UpdateAsync(Endereco endereco);
    }
}