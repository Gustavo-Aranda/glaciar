using AutoMapper;
using glaciar.Application.DTOs.Clientes;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;

namespace glaciar.Application.Services.Clientes
{
    public class PagamentoService : IPagamentoService
    {
        private readonly ICartaoService _cartaoService;
        private readonly ICupomService _cupomService;
        private readonly IMapper _mapper;

        public PagamentoService(
            ICartaoService cartaoService,
            ICupomService cupomService,
            IMapper mapper)
        {
            _cartaoService = cartaoService;
            _cupomService = cupomService;
            _mapper = mapper;
        }

        public async Task<PagamentoContextoDTO> ObterContextoAsync(int usuarioId)
        {
            var cartoes = await _cartaoService.GetByUsuarioAsync(usuarioId);
            var cupons = await _cupomService.ListarPorClienteAsync(usuarioId);

            return new PagamentoContextoDTO
            {
                Cartoes = _mapper.Map<IEnumerable<CartaoResponseDTO>>(cartoes),
                Cupons = cupons
            };
        }
    }
}
