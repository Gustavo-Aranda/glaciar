using glaciar.Application.DTOs.Clientes;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Clientes
{
    public class CartaoService : ICartaoService
    {
        private readonly ICartaoRepository _cartaoRepository;
        private readonly IUsuarioRepository _usuarioRepository;

        public CartaoService(
            ICartaoRepository cartaoRepository,
            IUsuarioRepository usuarioRepository)
        {
            _cartaoRepository = cartaoRepository;
            _usuarioRepository = usuarioRepository;
        }

        public async Task<UsuarioCartao> CreateAsync(CartaoCreateDTO dto)
        {
            await ValidarUsuarioAsync(dto.UsuarioId);
            var numero = NormalizarNumero(dto.Numero);
            ValidarNumero(numero);
            ValidarCvv(dto.Cvv);
            ValidarBandeira(dto.Bandeira);
            ValidarValidade(dto.MesValidade, dto.AnoValidade);

            if (dto.Padrao)
            {
                await _cartaoRepository.RemoverPadraoDoUsuarioAsync(dto.UsuarioId);
            }

            var cartao = new Cartao
            {
                UltimosDigitos = numero[^4..],
                Bandeira = dto.Bandeira,
                MesValidade = dto.MesValidade,
                AnoValidade = dto.AnoValidade
            };

            var vinculo = new UsuarioCartao
            {
                UsuarioId = dto.UsuarioId,
                Cartao = cartao,
                Padrao = dto.Padrao,
                Ativo = true
            };

            await _cartaoRepository.AddAsync(vinculo);
            return vinculo;
        }

        public async Task<IEnumerable<UsuarioCartao>> GetByUsuarioAsync(int usuarioId)
        {
            await ValidarUsuarioAsync(usuarioId);
            var cartoes = await _cartaoRepository.GetAtivosByUsuarioIdAsync(usuarioId);
            return cartoes;
        }

        public async Task<UsuarioCartao> GetByIdAsync(int usuarioId, int usuarioCartaoId)
        {
            return await ObterVinculoAsync(usuarioId, usuarioCartaoId);
        }

        public async Task<UsuarioCartao> UpdateAsync(int usuarioId, int usuarioCartaoId, CartaoUpdateDTO dto)
        {
            var vinculo = await ObterVinculoAsync(usuarioId, usuarioCartaoId);
            ValidarBandeira(dto.Bandeira);
            ValidarValidade(dto.MesValidade, dto.AnoValidade);

            if (dto.Padrao && !vinculo.Padrao)
            {
                await _cartaoRepository.RemoverPadraoDoUsuarioAsync(usuarioId);
            }

            vinculo.Cartao.Bandeira = dto.Bandeira;
            vinculo.Cartao.MesValidade = dto.MesValidade;
            vinculo.Cartao.AnoValidade = dto.AnoValidade;
            vinculo.Padrao = dto.Padrao;

            await _cartaoRepository.UpdateAsync(vinculo);
            return vinculo;
        }

        public async Task DeleteAsync(int usuarioId, int usuarioCartaoId)
        {
            var vinculo = await ObterVinculoAsync(usuarioId, usuarioCartaoId);
            vinculo.Padrao = false;
            vinculo.Ativo = false;
            await _cartaoRepository.UpdateAsync(vinculo);
        }

        private async Task<UsuarioCartao> ObterVinculoAsync(int usuarioId, int usuarioCartaoId)
        {
            var vinculo = await _cartaoRepository.GetByIdAsync(usuarioId, usuarioCartaoId);
            if (vinculo == null || !vinculo.Ativo)
            {
                throw new DomainValidationException("Cartão não encontrado para este cliente.");
            }

            return vinculo;
        }

        private async Task ValidarUsuarioAsync(int usuarioId)
        {
            var usuario = await _usuarioRepository.GetByIdAsync(usuarioId);
            if (usuario == null || !usuario.Ativo)
            {
                throw new DomainValidationException("O cliente informado não existe ou está inativo.");
            }
        }

        private static string NormalizarNumero(string numero)
        {
            return new string((numero ?? string.Empty).Where(char.IsDigit).ToArray());
        }

        private static void ValidarNumero(string numero)
        {
            if (numero.Length < 13 || numero.Length > 19 || !PassaNoAlgoritmoDeLuhn(numero))
            {
                throw new DomainValidationException("O número do cartão é inválido.");
            }
        }

        private static void ValidarCvv(string cvv)
        {
            var cvvNormalizado = new string((cvv ?? string.Empty).Where(char.IsDigit).ToArray());
            if (cvvNormalizado.Length < 3 || cvvNormalizado.Length > 4)
            {
                throw new DomainValidationException("O CVV do cartão é inválido.");
            }
        }

        private static bool PassaNoAlgoritmoDeLuhn(string numero)
        {
            var soma = 0;
            var dobrar = false;

            for (var indice = numero.Length - 1; indice >= 0; indice--)
            {
                var digito = numero[indice] - '0';
                if (dobrar)
                {
                    digito *= 2;
                    if (digito > 9) digito -= 9;
                }

                soma += digito;
                dobrar = !dobrar;
            }

            return soma % 10 == 0;
        }

        private static void ValidarBandeira(Domain.Entities.Clientes.Enum.BandeiraCartao bandeira)
        {
            if (!Enum.IsDefined(bandeira))
            {
                throw new DomainValidationException("A bandeira do cartão é inválida.");
            }
        }

        private static void ValidarValidade(int mes, int ano)
        {
            if (mes < 1 || mes > 12 || ano < 2000 || ano > 9999)
            {
                throw new DomainValidationException("A validade do cartão é inválida.");
            }

            var validade = new DateTime(ano, mes, 1);
            var mesAtual = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            if (validade < mesAtual)
            {
                throw new DomainValidationException("O cartão está vencido.");
            }
        }
    }
}
