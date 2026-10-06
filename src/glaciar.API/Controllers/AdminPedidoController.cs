using Microsoft.AspNetCore.Mvc;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/admin/pedidos")]
    public class AdminPedidoController : ControllerBase
    {
        private readonly IPedidoRepository _pedidoRepository;

        // Fluxo natural: EmAberto/EmProcessamento são definidos pelo sistema (carrinho/pagamento).
        // O admin só avança a partir de EmProcessamento (pedido já pago).
        private static readonly Dictionary<StatusPedido, StatusPedido[]> TransicoesPermitidas = new()
        {
            [StatusPedido.EmProcessamento] = new[] { StatusPedido.EmTransporte, StatusPedido.Cancelado },
            [StatusPedido.EmTransporte] = new[] { StatusPedido.Entregue, StatusPedido.Cancelado }
        };

        public AdminPedidoController(IPedidoRepository pedidoRepository)
        {
            _pedidoRepository = pedidoRepository;
        }

        [HttpGet]
        public async Task<IActionResult> ListarPedidos()
        {
            try
            {
                var pedidos = await _pedidoRepository.GetAllParaAdminAsync();
                
                var result = pedidos.Select(p => new
                {
                    Id = p.Id,
                    Codigo = p.Codigo,
                    Cliente = p.Usuario.Nome,
                    ValorTotal = p.ValorTotal,
                    Status = p.Status.ToString(),
                    Data = p.Data
                });

                return Ok(result);
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor." });
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(int id, [FromBody] StatusUpdateModel model)
        {
            try
            {
                var pedido = await _pedidoRepository.GetParaAdminByIdAsync(id);
                if (pedido == null)
                {
                    return NotFound(new { message = "Pedido não encontrado." });
                }

                if (!Enum.TryParse<StatusPedido>(model.Status, true, out var novoStatus))
                {
                    return BadRequest(new { message = "Status inválido." });
                }

                if (!TransicoesPermitidas.TryGetValue(pedido.Status, out var permitidos) || !permitidos.Contains(novoStatus))
                {
                    return BadRequest(new { message = $"Transição de '{pedido.Status}' para '{novoStatus}' não é permitida." });
                }

                pedido.Status = novoStatus;
                pedido.UpdatedAt = DateTime.UtcNow;

                await _pedidoRepository.UpdateAsync(pedido);

                return Ok(new { message = "Status atualizado com sucesso." });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno no servidor." });
            }
        }
    }

    public class StatusUpdateModel
    {
        public string Status { get; set; } = string.Empty;
    }
}
