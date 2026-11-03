using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface IRelatorioVendasService
    {
        Task<IReadOnlyList<CategoriaResumoDTO>> ListarCategoriasAsync();
        Task<VendasPorCategoriaResponseDTO> ObterVendasPorCategoriaAsync(FiltroVendasPorCategoriaDTO filtro);
    }
}

