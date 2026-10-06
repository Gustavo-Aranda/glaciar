using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Vendas;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/produtos")]
    public class ProdutoController : ControllerBase
    {
        private readonly IProdutoRepository _produtoRepository;

        public ProdutoController(IProdutoRepository produtoRepository)
        {
            _produtoRepository = produtoRepository;
        }

        // GET api/produtos?categoria=Masculino
        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] string? categoria)
        {
            try
            {
                var produtos = await _produtoRepository.GetVisiveisAsync(categoria);

                var result = produtos.Select(p => new ProdutoCatalogoDTO
                {
                    Id = p.Id,
                    Nome = p.Nome,
                    Descricao = p.Descricao,
                    Tipo = p.Tipo.ToString(),
                    Preco = p.Preco,
                    Estoques = p.Estoques
                        .OrderBy(e => e.Id)
                        .Select(e => new ProdutoCatalogoEstoqueDTO
                        {
                            EstoqueId = e.Id,
                            Tamanho = e.Tamanho,
                            Cor = e.Cor,
                            Quantidade = e.Quantidade
                        }).ToList()
                });

                return Ok(result);
            }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }

        // GET api/produtos/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(int id)
        {
            try
            {
                var produto = await _produtoRepository.GetByIdAsync(id);
                if (produto == null) return NotFound(new { message = "Produto não encontrado." });

                var result = new ProdutoCatalogoDTO
                {
                    Id = produto.Id,
                    Nome = produto.Nome,
                    Descricao = produto.Descricao,
                    Tipo = produto.Tipo.ToString(),
                    Preco = produto.Preco,
                    Estoques = produto.Estoques
                        .OrderBy(e => e.Id)
                        .Select(e => new ProdutoCatalogoEstoqueDTO
                        {
                            EstoqueId = e.Id,
                            Tamanho = e.Tamanho,
                            Cor = e.Cor,
                            Quantidade = e.Quantidade
                        }).ToList()
                };

                return Ok(result);
            }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }
    }
}
