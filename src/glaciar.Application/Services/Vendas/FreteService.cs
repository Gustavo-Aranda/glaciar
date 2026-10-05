using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.Services.Vendas
{
    /// <summary>
    /// Regra de frete por região do destino + adicional por unidade.
    /// por estar isolada atrás de IFreteService, a troca não afeta o checkout.
    /// </summary>
    public class FreteService : IFreteService
    {
        private const decimal AdicionalPorUnidadeExtra = 2.00m;

        private static readonly Dictionary<Estados, decimal> BasePorEstado = new()
        {
            // Sudeste
            [Estados.SP] = 15.00m, [Estados.RJ] = 15.00m, [Estados.MG] = 15.00m, [Estados.ES] = 15.00m,
            // Sul
            [Estados.PR] = 20.00m, [Estados.SC] = 20.00m, [Estados.RS] = 20.00m,
            // Centro-Oeste
            [Estados.DF] = 25.00m, [Estados.GO] = 25.00m, [Estados.MT] = 25.00m, [Estados.MS] = 25.00m,
            // Nordeste
            [Estados.BA] = 30.00m, [Estados.SE] = 30.00m, [Estados.AL] = 30.00m, [Estados.PE] = 30.00m,
            [Estados.PB] = 30.00m, [Estados.RN] = 30.00m, [Estados.CE] = 30.00m, [Estados.PI] = 30.00m,
            [Estados.MA] = 30.00m,
            // Norte
            [Estados.PA] = 35.00m, [Estados.AP] = 35.00m, [Estados.AM] = 35.00m, [Estados.RR] = 35.00m,
            [Estados.RO] = 35.00m, [Estados.AC] = 35.00m, [Estados.TO] = 35.00m
        };

        public decimal Calcular(Estados estadoDestino, int quantidadeUnidades)
        {
            if (quantidadeUnidades <= 0) return 0m;

            var baseRegional = BasePorEstado.TryGetValue(estadoDestino, out var valor) ? valor : 35.00m;
            var adicional = (quantidadeUnidades - 1) * AdicionalPorUnidadeExtra;

            return Math.Round(baseRegional + adicional, 2, MidpointRounding.AwayFromZero);
        }
    }
}
