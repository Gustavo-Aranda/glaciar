using glaciar.Application.DTOs.Enderecos;

namespace glaciar.Application.Interfaces.Services
{
    public interface IEnderecoService
    {
        Task<EnderecoResponseDTO> CreateEnderecoAsync(EnderecoCreateDTO dto);
        Task<IEnumerable<UsuarioEnderecoResponseDTO>> GetEnderecoClienteAsync(int clienteId);
        Task<EnderecoResponseDTO?> GetEnderecoAsync(int id);
        Task UpdateEnderecoAsync(EnderecoUpdateDTO dto);
        Task DisableEnderecoAsync(int usuarioEnderecoId);
    }
}
