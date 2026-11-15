using Microsoft.AspNetCore.Mvc;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/notificacoes")]
    public class NotificacaoController : ControllerBase
    {
        private readonly INotificacaoService _notificacaoService;

        public NotificacaoController(INotificacaoService notificacaoService)
        {
            _notificacaoService = notificacaoService;
        }

        private int GetUsuarioId()
        {
            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id))
                return id;
            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header.");
        }

        [HttpGet]
        public async Task<IActionResult> ListarNotificacoes()
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var dtos = await _notificacaoService.ListarPorUsuarioAsync(usuarioId);
                return Ok(dtos);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor ao carregar notificações.";
                return StatusCode(500, new { erro = msg });
            }
        }

        [HttpPatch("{id}/lida")]
        public async Task<IActionResult> MarcarComoLida(int id)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                await _notificacaoService.MarcarComoLidaAsync(usuarioId, id);
                return Ok(new { message = "Notificação marcada como lida." });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor ao marcar notificação como lida.";
                return StatusCode(500, new { erro = msg });
            }
        }
    }
}
