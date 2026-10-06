using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class CupomService : ICupomService
    {
        private readonly ICupomRepository _cupomRepository;

        public CupomService(ICupomRepository cupomRepository)
        {
            _cupomRepository = cupomRepository;
        }

        public async Task<CupomResponseDTO> ValidarAsync(int usuarioId, string codigo)
        {
            if (string.IsNullOrWhiteSpace(codigo))
                throw new DomainValidationException("O código do cupom deve ser informado.");

            var codigoNormalizado = codigo.Trim().ToUpperInvariant();
            var cupom = await _cupomRepository.GetByCodigoAsync(codigoNormalizado);

            CupomRegras.ValidarUso(cupom, usuarioId, codigoNormalizado);

            return VendasMapper.ParaCupom(cupom!);
        }

        public async Task<IEnumerable<CupomResponseDTO>> ListarCuponsDeTrocaAsync(int usuarioId)
        {
            var cupons = await _cupomRepository.GetTrocaDisponiveisByUsuarioAsync(usuarioId);
            return cupons.Select(VendasMapper.ParaCupom);
        }

        public async Task<IEnumerable<CupomResponseDTO>> ListarPorClienteAsync(int usuarioId)
        {
            var cupons = await _cupomRepository.GetDisponiveisByUsuarioAsync(usuarioId);
            return cupons.Select(VendasMapper.ParaCupom);
        }
    }
}
