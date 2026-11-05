using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/pedidos")]
    public class PedidoController : ControllerBase
    {
        private readonly IPedidoService _pedidoService;
        private readonly IPedidoStatusService _pedidoStatusService;

        public PedidoController(
            IPedidoService pedidoService,
            IPedidoStatusService pedidoStatusService)
        {
            _pedidoService = pedidoService;
            _pedidoStatusService = pedidoStatusService;
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

        /// <summary>
        /// Permite ao cliente avançar status permitidos a ele (ex: EmTransporte -> Entregue, Entregue -> TrocaSolicitada, TrocaAceita -> ItemEnviado).
        /// </summary>
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(int id, [FromBody] AlterarStatusPedidoDTO dto)
        {
            if (!ModelState.IsValid || !dto.Status.HasValue)
            {
                return BadRequest(new { message = "Informe um status válido para o pedido." });
            }

            try
            {
                var usuarioId = GetUsuarioId();
                var resultado = await _pedidoStatusService.AlterarStatusAsync(
                    id,
                    dto.Status.Value,
                    AtorTransicao.Cliente,
                    usuarioId);

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

        /// <summary>
        /// Solicita a troca de itens específicos (PedidoProdutoId + quantidade) de um pedido ENTREGUE.
        /// A troca do pedido completo só ocorre com "trocarPedidoInteiro": true (opt-in explícito);
        /// lista de itens vazia/ausente é rejeitada com 400.
        /// </summary>
        [HttpPost("{id}/troca")]
        public Task<IActionResult> SolicitarTroca(int id, [FromBody] SolicitarTrocaDTO dto) =>
            ExecutarSolicitacaoTrocaAsync(usuarioId => _pedidoStatusService.SolicitarTrocaAsync(id, usuarioId, dto));

        /// <summary>
        /// Abre a troca/devolução de UM ÚNICO item do pedido, identificado por PedidoProdutoId.
        /// O pedido é deduzido do item e validado contra o cliente logado (X-Usuario-Id).
        /// Body: { "pedidoProdutoId": 10, "quantidade": 1, "motivo": "..." }
        /// </summary>
        [HttpPost("itens/troca")]
        public Task<IActionResult> SolicitarTrocaDeItem([FromBody] SolicitarDevolucaoItemDTO dto) =>
            ExecutarSolicitacaoTrocaAsync(usuarioId => _pedidoStatusService.SolicitarDevolucaoDeItemAsync(usuarioId, dto));

        /// <summary>
        /// Pipeline comum (DRY) às solicitações de troca: validação do ModelState, identificação do cliente
        /// e tradução das exceções de domínio para os códigos HTTP correspondentes.
        /// </summary>
        private async Task<IActionResult> ExecutarSolicitacaoTrocaAsync(Func<int, Task<PedidoStatusAlteradoDTO>> solicitar)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var usuarioId = GetUsuarioId();
                var resultado = await solicitar(usuarioId);

                return Ok(new
                {
                    message = "Solicitação de troca registrada com sucesso.",
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
                return StatusCode(500, new { message = "Erro interno no servidor ao solicitar a troca." });
            }
        }
    }
}
