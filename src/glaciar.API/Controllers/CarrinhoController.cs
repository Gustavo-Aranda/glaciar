using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Clientes.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/carrinho")]
    public class CarrinhoController : ControllerBase
    {
        private readonly ICarrinhoService _carrinhoService;

        public CarrinhoController(ICarrinhoService carrinhoService)
        {
            _carrinhoService = carrinhoService;
        }

        // TODO: Em um cenário real, o usuarioId viria do token JWT (User.Claims).
        // Aqui estamos recebendo no header apenas para facilitar o desenvolvimento.
        private int GetUsuarioId()
        {
            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id))
                return id;
            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header.");
        }

        [HttpGet]
        public async Task<IActionResult> Obter()
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _carrinhoService.ObterAsync(usuarioId);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }

        [HttpPost("itens")]
        public async Task<IActionResult> AdicionarItem([FromBody] CarrinhoItemAddDTO dto)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _carrinhoService.AdicionarItemAsync(usuarioId, dto);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }

        /// <summary>
        /// Recebe o lote de quantidades finais do carrinho (0 = remover) e aplica tudo de forma atômica.
        /// Body: { "itens": [ { "itemId": 1, "quantidade": 3 }, { "itemId": 2, "quantidade": 0 } ] }
        /// </summary>
        [HttpPut("itens")]
        public async Task<IActionResult> SincronizarItens([FromBody] CarrinhoSincronizarDTO dto)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _carrinhoService.SincronizarItensAsync(usuarioId, dto);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }

        [HttpGet("frete/{estado}")]
        public async Task<IActionResult> CalcularFrete(Estados estado)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _carrinhoService.CalcularFreteAsync(usuarioId, estado);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }
    }
}
