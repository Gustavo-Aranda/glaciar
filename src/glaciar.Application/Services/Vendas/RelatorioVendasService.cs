using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class RelatorioVendasService : IRelatorioVendasService
    {
        private readonly IRelatorioVendasRepository _relatorioRepository;

        public RelatorioVendasService(IRelatorioVendasRepository relatorioRepository)
        {
            _relatorioRepository = relatorioRepository;
        }

        public async Task<IReadOnlyList<CategoriaResumoDTO>> ListarCategoriasAsync()
        {
            var categorias = await _relatorioRepository.ObterCategoriasAsync();
            return categorias
                .Select(c => new CategoriaResumoDTO
                {
                    Id = c.Id,
                    Nome = c.Nome
                })
                .ToList();
        }

        public async Task<VendasPorCategoriaResponseDTO> ObterVendasPorCategoriaAsync(FiltroVendasPorCategoriaDTO filtro)
        {
            if (filtro == null || !filtro.DataInicio.HasValue || !filtro.DataFim.HasValue)
            {
                throw new DomainValidationException("Informe a Data de Início e a Data de Fim para consultar o histórico de vendas.");
            }

            var inicio = filtro.DataInicio.Value.Date;
            var fim = filtro.DataFim.Value.Date;

            // RF0056: A data de fim não pode ser anterior à data de início.
            if (fim < inicio)
            {
                throw new DomainValidationException("A data final não pode ser anterior à data inicial.");
            }

            // RN0072: O intervalo entre a data de início e a data de fim deve ser de no mínimo 1 mês e no máximo 24 meses.
            var dataMinimaFim = inicio.AddMonths(1).AddDays(-1);
            if (fim < dataMinimaFim)
            {
                throw new DomainValidationException("O intervalo do período de análise deve ser de no mínimo 1 mês.");
            }

            var mesesDiferenca = ((fim.Year - inicio.Year) * 12) + fim.Month - inicio.Month;
            if (fim > inicio.AddMonths(24) || mesesDiferenca > 24)
            {
                throw new DomainValidationException("O intervalo do período de análise deve ser de no máximo 24 meses.");
            }

            // RF0057: Permitir escolher uma ou mais categorias de produtos simultaneamente para comparação.
            var idsFiltro = filtro.CategoriaIds?.Where(id => id > 0).Distinct().ToList() ?? new List<int>();
            var nomesFiltro = filtro.CategoriasNomes?
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => n.Trim().ToLowerInvariant())
                .Distinct()
                .ToList() ?? new List<string>();

            if (idsFiltro.Count == 0 && nomesFiltro.Count == 0)
            {
                throw new DomainValidationException("Selecione ao menos uma categoria de produto para comparação no gráfico.");
            }

            var categoriasSelecionadas = await _relatorioRepository.ObterCategoriasPorFiltroAsync(idsFiltro, nomesFiltro);
            if (categoriasSelecionadas.Count == 0)
            {
                throw new DomainValidationException("Nenhuma das categorias selecionadas foi encontrada no catálogo.");
            }

            // Constrói o eixo temporal contínuo agrupado por mês/ano (MM/yyyy) - RN0071
            var eixoMeses = new List<(int Ano, int Mes, string Label)>();
            var cursorMes = new DateTime(inicio.Year, inicio.Month, 1);
            var ultimoMes = new DateTime(fim.Year, fim.Month, 1);

            while (cursorMes <= ultimoMes)
            {
                eixoMeses.Add((cursorMes.Year, cursorMes.Month, $"{cursorMes.Month:D2}/{cursorMes.Year:D4}"));
                cursorMes = cursorMes.AddMonths(1);
            }

            // Limites UTC exatos (início do primeiro dia até o último instante do dia final)
            var dataInicioUtc = DateTime.SpecifyKind(inicio, DateTimeKind.Utc);
            var dataFimUtc = DateTime.SpecifyKind(fim.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            var categoriaIdsValidos = categoriasSelecionadas.Select(c => c.Id).ToList();

            var vendasAgregadas = await _relatorioRepository.ObterVendasEntreguesPorCategoriaEMesAsync(
                dataInicioUtc,
                dataFimUtc,
                categoriaIdsValidos);

            // Índice O(1) por (CategoriaId, Ano, Mes) para preenchimento contínuo com 0.00 (RN0073)
            var mapaVendas = vendasAgregadas.ToDictionary(
                v => (v.CategoriaId, v.Ano, v.Mes),
                v => Math.Round(v.ValorTotal, 2, MidpointRounding.AwayFromZero));

            var series = new List<SerieVendasCategoriaDTO>(categoriasSelecionadas.Count);

            foreach (var categoria in categoriasSelecionadas)
            {
                var valoresMensais = new List<decimal>(eixoMeses.Count);

                foreach (var mes in eixoMeses)
                {
                    var valorMes = mapaVendas.TryGetValue((categoria.Id, mes.Ano, mes.Mes), out var total)
                        ? total
                        : 0.00m;

                    valoresMensais.Add(valorMes);
                }

                series.Add(new SerieVendasCategoriaDTO
                {
                    CategoriaId = categoria.Id,
                    Categoria = categoria.Nome,
                    Valores = valoresMensais,
                    TotalPeriodo = valoresMensais.Sum()
                });
            }

            return new VendasPorCategoriaResponseDTO
            {
                DataInicio = inicio,
                DataFim = fim,
                Labels = eixoMeses.Select(m => m.Label).ToList(),
                Series = series,
                ValorTotalGeral = series.Sum(s => s.TotalPeriodo)
            };
        }
    }
}

