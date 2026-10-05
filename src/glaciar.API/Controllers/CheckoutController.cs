using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/checkout")]
    public class CheckoutController : ControllerBase
    {
        private readonly ICheckoutService _checkoutService;

        public CheckoutController(ICheckoutService checkoutService)
        {
            _checkoutService = checkoutService;
        }

        private int GetUsuarioId()
        {
            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id))
                return id;
            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header.");
        }

        [HttpPost("finalizar")]
        public async Task<IActionResult> FinalizarCompra([FromBody] CheckoutRequestDTO dto)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var result = await _checkoutService.FinalizarCompraAsync(usuarioId, dto);
                return Ok(result);
            }
            catch (DomainValidationException ex) { return BadRequest(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { message = "Erro interno no servidor.", details = ex.Message }); }
        }
    }
}
