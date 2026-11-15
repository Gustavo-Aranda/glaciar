using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/admin/pedidos")]
    public class AdminPedidoController : ControllerBase
    {
        private readonly IPedidoService _pedidoService;
        private readonly IPedidoStatusService _pedidoStatusService;

        public AdminPedidoController(
            IPedidoService pedidoService,
            IPedidoStatusService pedidoStatusService)
        {
            _pedidoService = pedidoService;
            _pedidoStatusService = pedidoStatusService;
        }

        [HttpGet]
        public async Task<IActionResult> ListarPedidos([FromQuery] string? tipo = null)
        {
            try
            {
                var pedidos = await _pedidoService.ListarParaAdminAsync(tipo);
                return Ok(pedidos);
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor ao listar pedidos.";
                return StatusCode(500, new { erro = msg, message = msg });
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(int id, [FromBody] AlterarStatusPedidoDTO dto)
        {
            if (!ModelState.IsValid || !dto.Status.HasValue)
            {
                const string msg = "Informe um status válido para o pedido.";
                return BadRequest(new { erro = msg, message = msg });
            }

            try
            {
                var resultado = await _pedidoStatusService.AlterarStatusAsync(
                    id,
                    dto.Status.Value,
                    AtorTransicao.Administrador);

                return Ok(new
                {
                    message = "Status atualizado com sucesso.",
                    dados = resultado
                });
            }
            catch (EntidadeNaoEncontradaException ex)
            {
                return NotFound(new { erro = ex.Message, message = ex.Message });
            }
            catch (ConflitoDeConcorrenciaException ex)
            {
                return Conflict(new { erro = ex.Message, message = ex.Message });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor ao atualizar o status.";
                return StatusCode(500, new { erro = msg, message = msg });
            }
        }
    }
}
