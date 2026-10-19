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
        public async Task<IActionResult> ListarPedidos()
        {
            try
            {
                var pedidos = await _pedidoService.ListarParaAdminAsync();
                return Ok(pedidos);
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor ao listar pedidos." });
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(int id, [FromBody] AlterarStatusPedidoDTO dto)
        {
            if (!ModelState.IsValid || !dto.Status.HasValue)
            {
                return BadRequest(new { message = "Informe um status válido para o pedido." });
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
                return NotFound(new { message = ex.Message });
            }
            catch (ConflitoDeConcorrenciaException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor ao atualizar o status." });
            }
        }
    }
}
