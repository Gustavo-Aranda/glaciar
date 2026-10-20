using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Domain.Entities.Vendas
{
    public sealed record ReposicaoEstoque(int EstoqueId, int Quantidade);

    /// <summary>
    /// Efeitos colaterais decididos pelo DOMÍNIO numa transição de status, mas que exigem I/O
    /// (repositórios) e por isso são executados pela camada Application.
    /// O domínio decide "o quê"; a Application apenas executa "como".
    /// </summary>
    public sealed class ResultadoTransicaoPedido
    {
        public ResultadoTransicaoPedido(StatusPedido statusAnterior, StatusPedido statusAtual)
        {
            StatusAnterior = statusAnterior;
            StatusAtual = statusAtual;
        }

        public StatusPedido StatusAnterior { get; }
        public StatusPedido StatusAtual { get; }

        /// <summary>Lista de itens e quantidades a serem repostos no estoque (cancelamento, reprovação ou recebimento de troca).</summary>
        public List<ReposicaoEstoque> ItensParaReposicao { get; } = new();

        /// <summary>Cupom de troca gerado ao concluir a troca (status Trocado). Deve ser persistido pela Application.</summary>
        public Cupom? CupomTrocaGerado { get; internal set; }

        /// <summary>Notificação decidida pelo domínio (ex: troca autorizada/aceita). Persistida pela Application.</summary>
        public Notificacao? Notificacao { get; internal set; }
    }
}
