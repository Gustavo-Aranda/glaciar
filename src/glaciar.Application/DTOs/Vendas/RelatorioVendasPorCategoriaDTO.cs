namespace glaciar.Application.DTOs.Vendas
{
    public class FiltroVendasPorCategoriaDTO
    {
        public DateTime? DataInicio { get; set; }
        public DateTime? DataFim { get; set; }
        public List<int> CategoriaIds { get; set; } = new();
        public List<string> CategoriasNomes { get; set; } = new();
    }

    public class CategoriaResumoDTO
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
    }

    public class SerieVendasCategoriaDTO
    {
        public int CategoriaId { get; set; }
        public string Categoria { get; set; } = string.Empty;

        /// <summary>
        /// Valores mensais em reais (R$) alinhados posicionalmente ao array Labels (preenchidos com 0.00 quando sem vendas).
        /// </summary>
        public List<decimal> Valores { get; set; } = new();

        /// <summary>
        /// Soma acumulada da categoria em todo o período filtrado.
        /// </summary>
        public decimal TotalPeriodo { get; set; }
    }

    public class VendasPorCategoriaResponseDTO
    {
        public DateTime DataInicio { get; set; }
        public DateTime DataFim { get; set; }

        /// <summary>
        /// Eixo horizontal (X): meses agrupados no formato "MM/yyyy" (RN0071).
        /// </summary>
        public List<string> Labels { get; set; } = new();

        /// <summary>
        /// Séries de dados por categoria para plotagem das linhas no gráfico (RF0057, RN0073).
        /// </summary>
        public List<SerieVendasCategoriaDTO> Series { get; set; } = new();

        /// <summary>
        /// Faturamento total somado das categorias selecionadas no período.
        /// </summary>
        public decimal ValorTotalGeral { get; set; }
    }
}

