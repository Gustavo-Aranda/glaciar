using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class PedidoService : IPedidoService
    {
        private readonly IPedidoRepository _pedidoRepository;

        public PedidoService(IPedidoRepository pedidoRepository)
        {
            _pedidoRepository = pedidoRepository;
        }

        public async Task<IEnumerable<PedidoResponseDTO>> ObterPedidosDoUsuarioAsync(int usuarioId)
        {
            var pedidos = await _pedidoRepository.GetByUsuarioAsync(usuarioId);
            return pedidos.Select(p => VendasMapper.ParaPedido(p)).ToList();
        }

        public async Task<PedidoResponseDTO?> ObterPedidoPorIdAsync(int usuarioId, int pedidoId)
        {
            var pedido = await _pedidoRepository.GetByIdAsync(usuarioId, pedidoId);
            return pedido == null ? null : VendasMapper.ParaPedido(pedido);
        }
    }
}
