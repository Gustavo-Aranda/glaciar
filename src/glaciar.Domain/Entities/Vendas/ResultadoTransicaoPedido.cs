using glaciar.Domain.Entities.Vendas.Enum;

namespace glaciar.Domain.Entities.Vendas
{
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

        /// <summary>Pedido abortado antes do envio (Cancelado / PagamentoReprovado): as unidades baixadas no checkout voltam ao estoque.</summary>
        public bool DevolverItensAoEstoque { get; internal set; }

        /// <summary>Cupom de troca gerado ao concluir a troca (status Trocado). Deve ser persistido pela Application.</summary>
        public Cupom? CupomTrocaGerado { get; internal set; }
    }
}
