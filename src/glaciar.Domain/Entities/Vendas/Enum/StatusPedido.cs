namespace glaciar.Domain.Entities.Vendas.Enum
{
    public enum StatusPedido
    {
        // ---------- Fluxo de venda ----------
        EmAberto,
        EmProcessamento,
        PagamentoRealizado,
        PagamentoReprovado,
        EmTransporte,
        Entregue,
        Cancelado,

        // ---------- Fluxo de troca (logística reversa) ----------
        TrocaSolicitada,
        TrocaAceita,
        TrocaNegada,
        ItemEnviado,
        ItemRecebido,
        Trocado
    }
}