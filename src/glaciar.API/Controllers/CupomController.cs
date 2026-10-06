using Microsoft.AspNetCore.Mvc;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/cupons")]
    public class CupomController : ControllerBase
    {
        private readonly ICupomService _cupomService;

        public CupomController(ICupomService cupomService)
        {
            _cupomService = cupomService;
        }

        private int GetUsuarioId()
        {
            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id))
                return id;
            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header.");
        }

        [HttpGet("validar/{codigo}")]
        public async Task<IActionResult> Validar(string codigo)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _cupomService.ValidarAsync(usuarioId, codigo);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }

        [HttpGet("trocas")]
        public async Task<IActionResult> ListarCuponsTroca()
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _cupomService.ListarCuponsDeTrocaAsync(usuarioId);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }

        [HttpGet("cliente/{usuarioId:int}")]
        public async Task<IActionResult> ListarPorCliente(int usuarioId)
        {
            try
            {
                var result = await _cupomService.ListarPorClienteAsync(usuarioId);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }

        [HttpGet("meus-cupons")]
        public async Task<IActionResult> ListarMeusCupons()
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _cupomService.ListarPorClienteAsync(usuarioId);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }
    }
}
