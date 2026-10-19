using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>Linha da listagem de pedidos do painel administrativo.</summary>
    public class PedidoAdminResumoDTO
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Cliente { get; set; } = string.Empty;
        public decimal ValorTotal { get; set; }
        public StatusPedido Status { get; set; }
        public DateTime Data { get; set; }

        /// <summary>
        /// Status que o ADMINISTRADOR pode aplicar a partir do status atual, calculados pela
        /// PedidoMaquinaEstados. O &lt;select&gt; do painel é montado exclusivamente com esta lista.
        /// </summary>
        public List<StatusPedido> ProximosStatus { get; set; } = new();
    }
}
