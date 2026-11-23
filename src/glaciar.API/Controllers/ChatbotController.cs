using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using glaciar.Application.DTOs.Chatbot;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/chatbot")]
    public class ChatbotController : ControllerBase
    {
        private readonly IChatbotService _chatbotService;

        public ChatbotController(IChatbotService chatbotService)
        {
            _chatbotService = chatbotService;
        }

        private int GetUsuarioId()
        {
            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idStr) && int.TryParse(idStr, out var id) && id > 0)
                return id;

            throw new DomainValidationException("Usuário não autenticado. Informe X-Usuario-Id no header.");
        }

        [HttpPost("mensagem")]
        [EnableRateLimiting("chatbot")]
        public async Task<IActionResult> EnviarMensagem([FromBody] ChatbotPerguntaRequestDTO dto, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var usuarioId = GetUsuarioId();
                var resposta = await _chatbotService.ProcessarMensagemAsync(usuarioId, dto, cancellationToken);
                return Ok(resposta);
            }
            catch (EntidadeNaoEncontradaException ex)
            {
                return NotFound(new { erro = ex.Message, message = ex.Message });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
            catch (ServicoIaIndisponivelException ex)
            {
                return StatusCode(503, new { erro = ex.Message, message = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno ao processar a recomendação da assistente virtual.";
                return StatusCode(500, new { erro = msg, message = msg });
            }
        }

        [HttpPost("feedback")]
        public async Task<IActionResult> RegistrarFeedback([FromBody] ChatbotFeedbackRequestDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var usuarioId = GetUsuarioId();
                await _chatbotService.RegistrarFeedbackAsync(usuarioId, dto);
                return Ok(new
                {
                    message = "Feedback registrado com sucesso! Suas próximas recomendações serão refinadas.",
                    interacaoId = dto.InteracaoId,
                    util = dto.Util
                });
            }
            catch (EntidadeNaoEncontradaException ex)
            {
                return NotFound(new { erro = ex.Message, message = ex.Message });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno ao registrar o feedback da recomendação.";
                return StatusCode(500, new { erro = msg, message = msg });
            }
        }

        [HttpGet("historico")]
        public async Task<IActionResult> ObterHistorico()
        {
            try
            {
                var usuarioId = GetUsuarioId();
                var historico = await _chatbotService.ObterHistoricoAsync(usuarioId);
                return Ok(historico);
            }
            catch (EntidadeNaoEncontradaException ex)
            {
                return NotFound(new { erro = ex.Message, message = ex.Message });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno ao carregar o histórico do chatbot.";
                return StatusCode(500, new { erro = msg, message = msg });
            }
        }
    }
}
