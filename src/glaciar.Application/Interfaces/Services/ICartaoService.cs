using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Entities.Clientes;

namespace glaciar.Application.Interfaces.Services
{
    public interface ICartaoService
    {
        Task<UsuarioCartao> CreateAsync(CartaoCreateDTO dto);
        Task<IEnumerable<UsuarioCartao>> GetByUsuarioAsync(int usuarioId);
        Task<UsuarioCartao> GetByIdAsync(int usuarioId, int usuarioCartaoId);
        Task<UsuarioCartao> UpdateAsync(int usuarioId, int usuarioCartaoId, CartaoUpdateDTO dto);
        Task DeleteAsync(int usuarioId, int usuarioCartaoId);
    }
}
