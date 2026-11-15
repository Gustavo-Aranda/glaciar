using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface IProdutoService
    {
        Task<IEnumerable<ProdutoCatalogoDTO>> ListarVisiveisAsync(string? categoria = null);
        Task<ProdutoCatalogoDTO?> ObterPorIdAsync(int id);
    }
}
