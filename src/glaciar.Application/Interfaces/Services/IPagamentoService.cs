using glaciar.Application.DTOs.Clientes;

namespace glaciar.Application.Interfaces.Services
{
    public interface IPagamentoService
    {
        Task<PagamentoContextoDTO> ObterContextoAsync(int usuarioId);
    }
}
