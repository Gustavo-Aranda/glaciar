using Microsoft.AspNetCore.Mvc;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/pedidos")]
    public class PedidoController : ControllerBase
    {
        private readonly IPedidoService _pedidoService;

        public PedidoController(IPedidoService pedidoService)
        {
            _pedidoService = pedidoService;
        }

        private int GetUsuarioId()
        {
            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id))
                return id;
            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header.");
        }

        /// <summary>
        /// Lista o histórico de pedidos finalizados do usuário logado.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> ListarPedidos()
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var resultado = await _pedidoService.ObterPedidosDoUsuarioAsync(usuarioId);
                return Ok(resultado);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor ao carregar pedidos." });
            }
        }

        /// <summary>
        /// Obtém os detalhes completos de um pedido específico do usuário.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> ObterPorId(int id)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var pedido = await _pedidoService.ObterPedidoPorIdAsync(usuarioId, id);
                if (pedido == null)
                    return NotFound(new { message = "Pedido não encontrado." });

                return Ok(pedido);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor ao buscar o pedido." });
            }
        }
    }
}
