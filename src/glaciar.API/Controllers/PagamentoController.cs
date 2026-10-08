using Microsoft.AspNetCore.Mvc;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/pagamentos")]
    public class PagamentoController : ControllerBase
    {
        private readonly IPagamentoService _pagamentoService;

        public PagamentoController(IPagamentoService pagamentoService)
        {
            _pagamentoService = pagamentoService;
        }

        private int ObterUsuarioId(int? usuarioIdDaRota = null)
        {
            if (usuarioIdDaRota.HasValue && usuarioIdDaRota.Value > 0)
                return usuarioIdDaRota.Value;

            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id))
                return id;

            if (Request.Query.TryGetValue("usuarioId", out var queryIdStr) && int.TryParse(queryIdStr, out var queryId))
                return queryId;

            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header ou o ID na rota.");
        }

        [HttpGet("contexto")]
        public async Task<IActionResult> ObterContexto()
        {
            try
            {
                var usuarioId = ObterUsuarioId();
                var result = await _pagamentoService.ObterContextoAsync(usuarioId);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }

        [HttpGet("contexto/{usuarioId:int}")]
        public async Task<IActionResult> ObterContextoPorId(int usuarioId)
        {
            try
            {
                var id = ObterUsuarioId(usuarioId);
                var result = await _pagamentoService.ObterContextoAsync(id);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }
    }
}
