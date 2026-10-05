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

        /// <summary>Retorna o endereço físico de um vínculo ATIVO pertencente ao usuário (uso no checkout).</summary>
        Task<EnderecoResponseDTO> ObterEnderecoDoClienteAsync(int usuarioId, int usuarioEnderecoId);

        /// <summary>
        /// Registra (ou reaproveita) o endereço físico para entrega. Só cria o vínculo
        /// UsuarioEndereco quando salvarNoPerfil = true.
        /// </summary>
        Task<EnderecoResponseDTO> RegistrarEnderecoDeEntregaAsync(EnderecoCreateDTO dto, bool salvarNoPerfil);
    }
}
