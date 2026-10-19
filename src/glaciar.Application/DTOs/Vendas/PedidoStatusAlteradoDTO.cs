using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>Resposta de uma transição de status bem-sucedida.</summary>
    public class PedidoStatusAlteradoDTO
    {
        public int PedidoId { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public StatusPedido StatusAnterior { get; set; }
        public StatusPedido StatusAtual { get; set; }

        /// <summary>Próximos status permitidos para o MESMO ator que executou a transição.</summary>
        public List<StatusPedido> ProximosStatus { get; set; } = new();

        /// <summary>Preenchido somente quando a troca é concluída (status Trocado).</summary>
        public CupomResponseDTO? CupomTrocaGerado { get; set; }
    }
}
