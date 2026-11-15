using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.Interfaces.Services
{
    public interface IUsuarioService
    {
        Task<UsuarioResponseDTO> CreateUsuarioAsync(UsuarioCreateDTO dto, TipoUsuario tipoUsuario = TipoUsuario.CLI);
        Task<UsuarioResponseDTO> LoginAsync(UsuarioLoginDTO dto);
        Task<IEnumerable<UsuarioResponseDTO>> GetUsuariosAsync();
        Task<UsuarioResponseDTO> GetUsuarioAsync(int id);
        Task<UsuarioResponseDTO> AtualizarUsuarioAsync(int id, UsuarioAdminUpdateDTO dto);
        Task<UsuarioResponseDTO> AtualizarPerfilAsync(int id, UsuarioPerfilUpdateDTO dto);
        Task ExcluirUsuarioAsync(int id);
        Task<UsuarioResponseDTO> AlterarStatusUsuarioAsync(int id, bool ativo);
        Task<bool> EhAdminAsync(int usuarioId);
    }
}
