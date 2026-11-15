using Microsoft.AspNetCore.Mvc;
using glaciar.Application.Interfaces.Services;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/produtos")]
    public class ProdutoController : ControllerBase
    {
        private readonly IProdutoService _produtoService;

        public ProdutoController(IProdutoService produtoService)
        {
            _produtoService = produtoService;
        }

        // GET api/produtos?categoria=Masculino
        [HttpGet]
        public async Task<IActionResult> Listar([FromQuery] string? categoria)
        {
            try
            {
                var result = await _produtoService.ListarVisiveisAsync(categoria);
                return Ok(result);
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor.";
                return StatusCode(500, new { erro = msg });
            }
        }

        // GET api/produtos/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(int id)
        {
            try
            {
                var result = await _produtoService.ObterPorIdAsync(id);
                if (result == null)
                {
                    const string msg = "Produto não encontrado.";
                    return NotFound(new { erro = msg });
                }

                return Ok(result);
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor.";
                return StatusCode(500, new { erro = msg });
            }
        }
    }
}
