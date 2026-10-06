using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.Application.Services.Vendas
{
    /// <summary>
    /// Regras de elegibilidade, categorias e cálculo progressivo de cupons.
    /// Isola todas as regras de negócio de cupons para permitir testes unitários puros sem I/O.
    /// </summary>
    internal static class CupomRegras
    {
        public static bool EhTroca(Cupom cupom) =>
            string.Equals(cupom.CategoriaCupom, CategoriasCupom.Troca, StringComparison.OrdinalIgnoreCase);

        /// <summary>Tudo que não é cupom de troca é tratado como promocional.</summary>
        public static bool EhPromocional(Cupom cupom) => !EhTroca(cupom);

        /// <summary>
        /// Valida se o cupom existe, está ativo, dentro da validade, com saldo e se pertence ao usuário.
        /// </summary>
        public static void ValidarUso(Cupom? cupom, int usuarioId, string codigoInformado)
        {
            if (cupom == null)
                throw new DomainValidationException($"Cupom '{codigoInformado}' não encontrado.");

            if (!cupom.Ativo || cupom.QuantidadeMaximaUso <= 0)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' não está mais disponível.");

            if (cupom.DataValidade < DateTime.UtcNow)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' está expirado.");

            if (cupom.ValorDesconto <= 0)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' não possui valor válido.");

            // Cupom de troca é pessoal: só o dono do saldo pode usar.
            if (EhTroca(cupom) && cupom.UsuarioId != usuarioId)
                throw new DomainValidationException($"O cupom de troca '{cupom.Codigo}' não pertence a este cliente.");

            // Cupom promocional pode ser global (UsuarioId nulo) ou direcionado a um cliente.
            if (EhPromocional(cupom) && cupom.UsuarioId.HasValue && cupom.UsuarioId != usuarioId)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' não é válido para este cliente.");
        }

        /// <summary>
        /// Normaliza a lista de códigos e valida se há duplicidades na mesma compra.
        /// </summary>
        public static List<string> NormalizarEValidarCodigos(IEnumerable<string>? codigosCupons)
        {
            if (codigosCupons == null || !codigosCupons.Any())
                return new List<string>();

            var codigosLimpos = codigosCupons
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Select(c => c.Trim().ToUpperInvariant())
                .ToList();

            var codigoDuplicado = codigosLimpos
                .GroupBy(c => c)
                .FirstOrDefault(g => g.Count() > 1);

            if (codigoDuplicado != null)
            {
                throw new DomainValidationException($"O cupom '{codigoDuplicado.Key}' foi informado mais de uma vez na mesma compra.");
            }

            return codigosLimpos;
        }

        /// <summary>
        /// Apenas 1 (um) cupom promocional é permitido por compra. Cupons de troca podem ser múltiplos.
        /// </summary>
        public static (Cupom? Promocional, List<Cupom> Trocas) SepararEValidarCategorias(IEnumerable<Cupom> cupons)
        {
            var promocionais = cupons.Where(EhPromocional).ToList();
            var trocas = cupons.Where(EhTroca).ToList();

            // Validação estrita: no máximo 1 promocional
            if (promocionais.Count > 1)
            {
                throw new DomainValidationException("Apenas 1 (um) cupom promocional é permitido por compra. Os demais devem ser cupons de troca.");
            }

            return (promocionais.FirstOrDefault(), trocas);
        }

        /// <summary>
        /// Aplica o cálculo progressivo de abatimento do pedido.
        /// 1. Abate primeiro o cupom promocional (se houver).
        /// 2. Abate os cupons de troca um a um. Se o saldo já estiver zerado, proíbe cupons de troca desnecessários.
        /// 3. Se um cupom de troca exceder o saldo restante, calcula o troco.
        /// </summary>
        public static PlanoAbatimentoCupons CalcularAbatimento(
            decimal valorTotalCompra,
            Cupom? promocional,
            IEnumerable<Cupom> cuponsTroca)
        {
            var plano = new PlanoAbatimentoCupons
            {
                SaldoDevedor = valorTotalCompra
            };

            // 1. Cupom promocional (prioridade)
            if (promocional != null)
            {
                var desconto = Math.Min(promocional.ValorDesconto, plano.SaldoDevedor);
                plano.SaldoDevedor -= desconto;
                plano.TotalDescontosAplicados += desconto;
                plano.CuponsUtilizados.Add(promocional);
            }

            // 2. Cupons de troca
            foreach (var troca in cuponsTroca)
            {
                // Se o saldo da compra já foi 100% coberto, cupons adicionais são desnecessários
                if (plano.SaldoDevedor <= 0)
                {
                    throw new DomainValidationException(
                        $"O cupom de troca '{troca.Codigo}' é desnecessário, pois o valor total da compra já foi coberto pelos cupons anteriores.");
                }

                plano.CuponsUtilizados.Add(troca);

                if (troca.ValorDesconto > plano.SaldoDevedor)
                {
                    // Cupom de troca maior que o saldo restante -> gera troco
                    plano.ValorTrocoGerado = troca.ValorDesconto - plano.SaldoDevedor;
                    plano.TotalDescontosAplicados += plano.SaldoDevedor;
                    plano.SaldoDevedor = 0m;
                }
                else
                {
                    plano.SaldoDevedor -= troca.ValorDesconto;
                    plano.TotalDescontosAplicados += troca.ValorDesconto;
                }
            }

            return plano;
        }

        /// <summary>
        /// Cria a entidade de um novo Cupom de Troca correspondente ao troco da compra.
        /// </summary>
        public static Cupom CriarCupomTroca(int usuarioId, decimal valorTroco)
        {
            return new Cupom
            {
                Codigo = $"TROCA-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                ValorDesconto = Math.Round(valorTroco, 2, MidpointRounding.AwayFromZero),
                DataValidade = DateTime.UtcNow.AddYears(1),
                CategoriaCupom = CategoriasCupom.Troca,
                Ativo = true,
                QuantidadeMaximaUso = 1,
                UsuarioId = usuarioId
            };
        }
    }

    /// <summary>
    /// Resultado puro do cálculo de abatimento de cupons (sem efeitos colaterais).
    /// </summary>
    internal class PlanoAbatimentoCupons
    {
        public decimal SaldoDevedor { get; set; }
        public decimal TotalDescontosAplicados { get; set; }
        public decimal ValorTrocoGerado { get; set; }
        public List<Cupom> CuponsUtilizados { get; set; } = new();
        public bool TemTroco => ValorTrocoGerado > 0;
        public bool HouveCuponsUtilizados => CuponsUtilizados.Any();
    }
}
