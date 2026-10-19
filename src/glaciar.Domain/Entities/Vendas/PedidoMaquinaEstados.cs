using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.Domain.Entities.Vendas
{
    /// <summary>
    /// FONTE ÚNICA DA VERDADE das transições de status do Pedido.
    ///
    /// Cada entrada declara: (status atual, próximo status) → atores autorizados.
    /// Qualquer par ausente da tabela é, por definição, PROIBIDO — inclusive pular etapas,
    /// voltar etapas ou sair de estados finais (Cancelado, PagamentoReprovado, TrocaNegada, Trocado).
    ///
    /// Esta tabela é consumida por:
    ///  - <see cref="Pedido.AlterarStatus"/> (bloqueio no backend);
    ///  - os DTOs de resposta (lista "ProximosStatus"), que alimentam os <select>/botões do frontend.
    /// Assim, front e back nunca divergem: adicionar uma etapa nova é adicionar UMA linha aqui.
    /// </summary>
    public static class PedidoMaquinaEstados
    {
        private static readonly IReadOnlyDictionary<(StatusPedido De, StatusPedido Para), AtorTransicao> Transicoes =
            new Dictionary<(StatusPedido, StatusPedido), AtorTransicao>
            {
                // ---------- Fluxo de venda ----------
                [(StatusPedido.EmAberto,           StatusPedido.EmProcessamento)]    = AtorTransicao.Sistema,
                [(StatusPedido.EmProcessamento,    StatusPedido.PagamentoRealizado)] = AtorTransicao.Administrador,
                [(StatusPedido.EmProcessamento,    StatusPedido.PagamentoReprovado)] = AtorTransicao.Administrador,
                [(StatusPedido.EmProcessamento,    StatusPedido.Cancelado)]          = AtorTransicao.Administrador,
                [(StatusPedido.PagamentoRealizado, StatusPedido.EmTransporte)]       = AtorTransicao.Administrador,
                [(StatusPedido.EmTransporte,       StatusPedido.Entregue)]           = AtorTransicao.Administrador | AtorTransicao.Cliente,

                // ---------- Fluxo de troca (logística reversa) ----------
                [(StatusPedido.Entregue,           StatusPedido.TrocaSolicitada)]    = AtorTransicao.Cliente,
                [(StatusPedido.TrocaSolicitada,    StatusPedido.TrocaAceita)]        = AtorTransicao.Administrador,
                [(StatusPedido.TrocaSolicitada,    StatusPedido.TrocaNegada)]        = AtorTransicao.Administrador,
                [(StatusPedido.TrocaAceita,        StatusPedido.ItemEnviado)]        = AtorTransicao.Cliente,
                [(StatusPedido.ItemEnviado,        StatusPedido.ItemRecebido)]       = AtorTransicao.Administrador,
                [(StatusPedido.ItemRecebido,       StatusPedido.Trocado)]            = AtorTransicao.Administrador,
            };

        /// <summary>Indica se <paramref name="ator"/> pode levar o pedido de <paramref name="de"/> para <paramref name="para"/>.</summary>
        public static bool PodeTransicionar(StatusPedido de, StatusPedido para, AtorTransicao ator) =>
            EhAtorUnico(ator)
            && Transicoes.TryGetValue((de, para), out var autorizados)
            && autorizados.HasFlag(ator);

        /// <summary>
        /// Próximos status que o <paramref name="ator"/> pode aplicar a partir de <paramref name="atual"/>.
        /// É exatamente esta lista que o frontend deve exibir — nada além dela.
        /// </summary>
        public static IReadOnlyList<StatusPedido> ProximosStatus(StatusPedido atual, AtorTransicao ator)
        {
            if (!EhAtorUnico(ator)) return Array.Empty<StatusPedido>();

            return Transicoes
                .Where(t => t.Key.De == atual && t.Value.HasFlag(ator))
                .Select(t => t.Key.Para)
                .OrderBy(s => s)
                .ToList();
        }

        /// <summary>Estado final: nenhuma transição de saída, para nenhum ator.</summary>
        public static bool EhEstadoFinal(StatusPedido status) =>
            !Transicoes.Keys.Any(k => k.De == status);

        /// <summary>
        /// Garante a transição ou lança <see cref="DomainValidationException"/> com uma mensagem precisa
        /// (status inexistente, status repetido, ator sem permissão ou etapa pulada).
        /// </summary>
        public static void ValidarTransicao(StatusPedido de, StatusPedido para, AtorTransicao ator)
        {
            // "System." é obrigatório: dentro deste namespace, "Enum" resolve para glaciar.Domain.Entities.Vendas.Enum.
            if (!System.Enum.IsDefined(para))
                throw new DomainValidationException("O status de destino informado é inválido.");

            if (!EhAtorUnico(ator))
                throw new DomainValidationException("O ator da transição é inválido.");

            if (de == para)
                throw new DomainValidationException($"O pedido já está no status '{para}'.");

            if (!Transicoes.TryGetValue((de, para), out var autorizados))
            {
                var validos = Transicoes.Keys.Where(k => k.De == de).Select(k => k.Para.ToString()).ToList();
                var sufixo = validos.Count == 0
                    ? $"'{de}' é um estado final."
                    : $"Próximo(s) status válido(s): {string.Join(", ", validos)}.";

                throw new DomainValidationException($"Transição de '{de}' para '{para}' não é permitida. {sufixo}");
            }

            if (!autorizados.HasFlag(ator))
                throw new DomainValidationException(
                    $"A transição de '{de}' para '{para}' não pode ser executada pelo ator '{ator}'.");
        }

        /// <summary>Bloqueia combinações de flags (ex.: Cliente|Administrador) e o valor Nenhum como "ator" de uma chamada.</summary>
        private static bool EhAtorUnico(AtorTransicao ator) =>
            ator != AtorTransicao.Nenhum && (ator & (ator - 1)) == 0 && System.Enum.IsDefined(ator);
    }
}
