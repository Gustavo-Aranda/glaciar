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

        [HttpPut("itens/{itemId}")]
        public async Task<IActionResult> AtualizarItem(int itemId, [FromBody] CarrinhoItemUpdateDTO dto)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _carrinhoService.AtualizarItemAsync(usuarioId, itemId, dto);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception) { return StatusCode(500, new { message = "Erro interno no servidor." }); }
        }

        [HttpDelete("itens/{itemId}")]
        public async Task<IActionResult> RemoverItem(int itemId)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _carrinhoService.RemoverItemAsync(usuarioId, itemId);
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
