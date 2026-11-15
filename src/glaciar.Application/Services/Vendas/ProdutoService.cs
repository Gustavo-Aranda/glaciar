using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class ProdutoService : IProdutoService
    {
        private readonly IProdutoRepository _produtoRepository;

        public ProdutoService(IProdutoRepository produtoRepository)
        {
            _produtoRepository = produtoRepository;
        }

        public async Task<IEnumerable<ProdutoCatalogoDTO>> ListarVisiveisAsync(string? categoria = null)
        {
            var produtos = await _produtoRepository.GetVisiveisAsync(categoria);
            return produtos.Select(VendasMapper.ParaCatalogo).ToList();
        }

        public async Task<ProdutoCatalogoDTO?> ObterPorIdAsync(int id)
        {
            var produto = await _produtoRepository.GetByIdAsync(id);
            return produto == null ? null : VendasMapper.ParaCatalogo(produto);
        }
    }
}
