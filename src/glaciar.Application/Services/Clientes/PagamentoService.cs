using glaciar.Application.DTOs.Clientes;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;

namespace glaciar.Application.Services.Clientes
{
    public class PagamentoService : IPagamentoService
    {
        private readonly ICartaoService _cartaoService;
        private readonly ICupomService _cupomService;

        public PagamentoService(
            ICartaoService cartaoService,
            ICupomService cupomService)
        {
            _cartaoService = cartaoService;
            _cupomService = cupomService;
        }

        public async Task<PagamentoContextoDTO> ObterContextoAsync(int usuarioId)
        {
            var cartoes = await _cartaoService.GetByUsuarioAsync(usuarioId);
            var cupons = await _cupomService.ListarPorClienteAsync(usuarioId);

            return new PagamentoContextoDTO
            {
                Cartoes = cartoes.Select(ClientesMapper.ParaCartao).ToList(),
                Cupons = cupons
            };
        }
    }
}
