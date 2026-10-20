using glaciar.Application.DTOs.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Application.Interfaces.Services
{
    /// <summary>
    /// Orquestrador ÚNICO de mudanças de status pós-compra (venda e logística reversa).
    /// Substitui qualquer método específico por transição (AprovarPagamento, Despachar, AceitarTroca...):
    /// a regra de "qual transição é válida" vive no Domain; aqui só há busca → transição → persistência.
    /// </summary>
    public interface IPedidoStatusService
    {
        /// <param name="pedidoId">Pedido alvo.</param>
        /// <param name="novoStatus">Status desejado.</param>
        /// <param name="ator">Cliente ou Administrador (Sistema é proibido via API).</param>
        /// <param name="usuarioId">Obrigatório quando o ator é Cliente: garante que o pedido é dele.</param>
        Task<PedidoStatusAlteradoDTO> AlterarStatusAsync(
            int pedidoId,
            StatusPedido novoStatus,
            AtorTransicao ator,
            int? usuarioId = null);

        /// <summary>
        /// Caso de uso específico para o Cliente solicitar a troca de um pedido ENTREGUE,
        /// especificando quais itens/unidades deseja trocar e o motivo.
        /// </summary>
        Task<PedidoStatusAlteradoDTO> SolicitarTrocaAsync(
            int pedidoId,
            int usuarioId,
            SolicitarTrocaDTO dto);
    }
}
