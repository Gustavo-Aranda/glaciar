using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/notificacoes")]
    public class NotificacaoController : ControllerBase
    {
        private readonly INotificacaoRepository _notificacaoRepository;

        public NotificacaoController(INotificacaoRepository notificacaoRepository)
        {
            _notificacaoRepository = notificacaoRepository;
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
                var notificacoes = await _notificacaoRepository.GetByUsuarioAsync(usuarioId);

                var dtos = notificacoes.Select(n => new NotificacaoResponseDTO
                {
                    Id = n.Id,
                    UsuarioId = n.UsuarioId,
                    PedidoId = n.PedidoId,
                    Mensagem = n.Mensagem,
                    Lida = n.Lida,
                    CreatedAt = n.CreatedAt
                });

                return Ok(dtos);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor ao carregar notificações." });
            }
        }

        [HttpPatch("{id}/lida")]
        public async Task<IActionResult> MarcarComoLida(int id)
        {
            try
            {
                var usuarioId = GetUsuarioId();
                await _notificacaoRepository.MarcarComoLidaAsync(usuarioId, id);
                return Ok(new { message = "Notificação marcada como lida." });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor ao marcar notificação como lida." });
            }
        }
    }
}
