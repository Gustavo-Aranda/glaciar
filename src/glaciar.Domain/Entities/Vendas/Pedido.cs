using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Entities.Logisticas;
using glaciar.Domain.Entities.Logisticas.Enum;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.Domain.Entities.Vendas
{
    public class Pedido
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ValorTotal { get; set; }

        [Required]
        public string Codigo { get; set; } = null!;

        [Required]
        public DateTime Data { get; set; }

        /// <summary>
        /// Setter PRIVADO: a única forma de mudar o status é <see cref="AlterarStatus"/>,
        /// que passa obrigatoriamente pela <see cref="PedidoMaquinaEstados"/>. O EF Core materializa via setter privado.
        /// Todo Pedido nasce como carrinho (EmAberto).
        /// </summary>
        [Required]
        public StatusPedido Status { get; private set; } = StatusPedido.EmAberto;


        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [Required]
        public int UsuarioId { get; set; }
        [ForeignKey("UsuarioId")]
        public Usuario Usuario { get; set; } = null!;

        // Opcional: enquanto o Pedido está "EmAberto" (carrinho) ainda não há endereço de entrega.
        // O checkout garante o preenchimento antes de mudar o status para "EmProcessamento".
        public int? EnderecoId { get; set; }
        [ForeignKey("EnderecoId")]
        public Endereco? Endereco { get; set; }
        
        public ICollection<PedidoCupom> CuponsAplicados { get; set; } = new List<PedidoCupom>();

        public ICollection<PedidoProduto> ProdutosDoPedido { get; set; } = new List<PedidoProduto>();
        public ICollection<Pagamento> Pagamentos { get; set; } = new List<Pagamento>();
        public ICollection<Entrega> Entregas { get; set; } = new List<Entrega>();
        public ICollection<Devolucao> Devolucoes { get; set; } = new List<Devolucao>();

        // =====================================================================
        // GESTÃO DE CARRINHO (RESERVA TEMPORÁRIA E EXPIRAÇÃO - 15 MINUTOS)
        // =====================================================================
        public static readonly TimeSpan TempoReserva = TimeSpan.FromMinutes(15);
        public static readonly TimeSpan AvisoAntecedencia = TimeSpan.FromMinutes(5);

        public DateTime? ReservaExpiraEm { get; private set; }
        public DateTime? CarrinhoExpiradoEm { get; private set; }

        public bool ReservaExpirada(DateTime agora) =>
            Status == StatusPedido.EmAberto && ReservaExpiraEm.HasValue && ReservaExpiraEm.Value <= agora;

        public void IniciarOuManterReserva(DateTime agora)
        {
            if (ReservaExpiraEm.HasValue && !CarrinhoExpiradoEm.HasValue) return;
            ReservaExpiraEm = agora + TempoReserva;
            CarrinhoExpiradoEm = null;
            UpdatedAt = agora;
        }

        public void GarantirReservaVigente(DateTime agora)
        {
            if (Status != StatusPedido.EmAberto) return;

            if (CarrinhoExpiradoEm.HasValue || ReservaExpirada(agora))
            {
                throw new DomainValidationException("O tempo de reserva do carrinho (15 minutos) esgotou. Adicione os itens novamente.");
            }
        }

        /// <summary>
        /// Esvazia o carrinho expirado, devolvendo a lista de itens/quantidades que devem ser liberadas da reserva do estoque.
        /// </summary>
        public IReadOnlyList<ReposicaoEstoque> ExpirarCarrinho(DateTime agora)
        {
            if (Status != StatusPedido.EmAberto)
            {
                throw new DomainValidationException("Apenas carrinhos em aberto podem ser expirados.");
            }

            var itensParaLiberar = ProdutosDoPedido
                .Select(i => new ReposicaoEstoque(i.EstoqueId, i.Quantidade))
                .ToList();

            ProdutosDoPedido.Clear();
            ValorTotal = 0m;
            ReservaExpiraEm = null;
            CarrinhoExpiradoEm = agora;
            UpdatedAt = agora;

            return itensParaLiberar;
        }

        // =====================================================================
        // MÁQUINA DE ESTADOS — ÚNICA PORTA DE ENTRADA PARA MUDAR O STATUS
        // =====================================================================

        /// <summary>
        /// Avança o pedido para <paramref name="novoStatus"/> em nome de <paramref name="ator"/>.
        /// 1) Valida a transição (status anterior correto + ator autorizado) — lança DomainValidationException se inválida;
        /// 2) Valida as pré-condições específicas do destino;
        /// 3) Só então aplica os efeitos colaterais internos ao agregado (Pagamentos, Entrega) e grava o novo status.
        /// Efeitos que exigem I/O (estoque, novo cupom) são devolvidos em <see cref="ResultadoTransicaoPedido"/>.
        /// </summary>
        /// <remarks>
        /// Requer as coleções ProdutosDoPedido, Pagamentos, Entregas e CuponsAplicados(.Cupom) carregadas.
        /// </remarks>
        /// <summary>
        /// Solicita a troca de unidades/itens específicos ou do pedido inteiro (se itens for nulo ou vazio).
        /// Valida se o pedido está ENTREGUE, gera os registros de Devolucao com o crédito rateado
        /// e avança o status para TrocaSolicitada.
        /// </summary>
        public ResultadoTransicaoPedido SolicitarTroca(IEnumerable<ItemTroca>? itens, string motivo)
        {
            if (Status != StatusPedido.Entregue)
            {
                throw new DomainValidationException(
                    $"Só é possível solicitar troca de pedidos ENTREGUES (status atual: {Status}).");
            }

            if (string.IsNullOrWhiteSpace(motivo))
            {
                throw new DomainValidationException("Informe o motivo da troca.");
            }

            if (!ProdutosDoPedido.Any())
            {
                throw new DomainValidationException("Os itens do pedido não foram carregados.");
            }

            var itensInformados = itens?.ToList() ?? new List<ItemTroca>();
            var selecao = itensInformados.Count == 0
                ? ProdutosDoPedido.Select(i => (Item: i, Qtd: i.Quantidade)).ToList()
                : itensInformados.Select(t =>
                {
                    var item = ProdutosDoPedido.FirstOrDefault(i => i.Id == t.PedidoProdutoId)
                        ?? throw new DomainValidationException("Item informado não pertence a este pedido.");

                    if (t.Quantidade < 1 || t.Quantidade > item.Quantidade)
                    {
                        throw new DomainValidationException(
                            $"Quantidade inválida para troca no item '{item.Estoque?.Produto?.Nome ?? "Produto"}'. Comprado: {item.Quantidade}, Solicitado: {t.Quantidade}.");
                    }

                    return (Item: item, Qtd: t.Quantidade);
                }).ToList();

            if (selecao.GroupBy(s => s.Item.Id).Any(g => g.Count() > 1))
            {
                throw new DomainValidationException("O mesmo item foi informado mais de uma vez para troca.");
            }

            var agora = DateTime.UtcNow;
            var totalCredito = CalcularCreditoTroca(selecao);
            var brutoTotal = selecao.Sum(s => s.Item.Preco * s.Qtd);
            var acumulado = 0m;

            for (var n = 0; n < selecao.Count; n++)
            {
                var (item, qtd) = selecao[n];
                var valor = n == selecao.Count - 1
                    ? totalCredito - acumulado
                    : Math.Round(totalCredito * (item.Preco * qtd) / brutoTotal, 2, MidpointRounding.AwayFromZero);

                acumulado += valor;
                Devolucoes.Add(Devolucao.Criar(item, qtd, motivo.Trim(), valor, agora));
            }

            return AlterarStatus(StatusPedido.TrocaSolicitada, AtorTransicao.Cliente);
        }

        public ResultadoTransicaoPedido AlterarStatus(StatusPedido novoStatus, AtorTransicao ator)
        {
            PedidoMaquinaEstados.ValidarTransicao(Status, novoStatus, ator);

            var agora = DateTime.UtcNow;
            var resultado = new ResultadoTransicaoPedido(Status, novoStatus);

            switch (novoStatus)
            {
                case StatusPedido.EmProcessamento:
                    GarantirProntoParaProcessamento();
                    break;

                case StatusPedido.PagamentoRealizado:
                    AtualizarPagamentos(StatusPagamento.PagamentoRealizado, agora);
                    break;

                case StatusPedido.PagamentoReprovado:
                    AtualizarPagamentos(StatusPagamento.PagamentoRecusado, agora);
                    AtualizarEntrega(StatusEntrega.Cancelado, agora, obrigatoria: false);
                    ReporTodosOsItens(resultado);
                    break;

                case StatusPedido.Cancelado:
                    AtualizarPagamentos(StatusPagamento.PagamentoCancelado, agora);
                    AtualizarEntrega(StatusEntrega.Cancelado, agora, obrigatoria: false);
                    ReporTodosOsItens(resultado);
                    break;

                case StatusPedido.EmTransporte:
                    AtualizarEntrega(StatusEntrega.EmTransporte, agora, obrigatoria: true)!.DataDespacho = agora;
                    break;

                case StatusPedido.Entregue:
                    AtualizarEntrega(StatusEntrega.Entregue, agora, obrigatoria: true)!.DataEntrega = agora;
                    break;

                case StatusPedido.TrocaSolicitada:
                    if (!Devolucoes.Any(d => d.Status == StatusDevolucao.EmTroca))
                    {
                        throw new DomainValidationException("Use a solicitação de troca informando os itens e o motivo.");
                    }
                    break;

                case StatusPedido.TrocaAceita:
                    AtualizarDevolucoes(StatusDevolucao.TrocaAutorizada, agora);
                    resultado.Notificacao = Notificacao.TrocaAutorizada(UsuarioId, Id, Codigo);
                    break;

                case StatusPedido.TrocaNegada:
                    AtualizarDevolucoes(StatusDevolucao.TrocaRecusada, agora);
                    break;

                case StatusPedido.Trocado:
                    var devolucoesAtivas = AtualizarDevolucoes(StatusDevolucao.TrocaProcessada, agora);
                    foreach (var d in devolucoesAtivas)
                    {
                        var item = ProdutosDoPedido.First(i => i.Id == d.PedidoProdutoId);
                        resultado.ItensParaReposicao.Add(new ReposicaoEstoque(item.EstoqueId, d.Quantidade));
                    }

                    var credito = devolucoesAtivas.Sum(d => d.Valor);
                    if (credito > 0m)
                    {
                        resultado.CupomTrocaGerado = Cupom.CriarCupomTroca(UsuarioId, credito);
                    }
                    break;

                // ItemEnviado, ItemRecebido: mudança puramente de status
            }

            Status = novoStatus;
            UpdatedAt = agora;
            return resultado;
        }

        /// <summary>
        /// Crédito de troca = valor dos itens selecionados − desconto PROMOCIONAL rateado proporcionalmente.
        /// Cupons de troca (vale-troca) não reduzem o crédito, pois são créditos prévios do cliente.
        /// </summary>
        public decimal CalcularCreditoTroca(IReadOnlyCollection<(PedidoProduto Item, int Qtd)> selecao)
        {
            var subtotalPedido = ProdutosDoPedido.Sum(i => i.Preco * i.Quantidade);
            if (subtotalPedido <= 0m)
            {
                throw new DomainValidationException("Os itens do pedido não foram carregados para o cálculo do crédito de troca.");
            }

            var brutoSelecionado = selecao.Sum(s => s.Item.Preco * s.Qtd);
            var descontoPromocional = CuponsAplicados
                .Where(pc => pc.Cupom != null && !pc.Cupom.EhTroca)
                .Sum(pc => pc.Cupom.ValorDesconto);

            var descontoAplicado = Math.Min(descontoPromocional, subtotalPedido);
            var parcelaDesconto = (brutoSelecionado / subtotalPedido) * descontoAplicado;

            var credito = brutoSelecionado - parcelaDesconto;
            return Math.Round(credito, 2, MidpointRounding.AwayFromZero);
        }

        public decimal CalcularValorCreditoTroca()
        {
            if (!ProdutosDoPedido.Any())
            {
                throw new DomainValidationException("Os itens do pedido não foram carregados para o cálculo do crédito de troca.");
            }

            return CalcularCreditoTroca(ProdutosDoPedido.Select(i => (i, i.Quantidade)).ToList());
        }

        private void ReporTodosOsItens(ResultadoTransicaoPedido resultado)
        {
            foreach (var item in ProdutosDoPedido)
            {
                resultado.ItensParaReposicao.Add(new ReposicaoEstoque(item.EstoqueId, item.Quantidade));
            }
        }

        private List<Devolucao> AtualizarDevolucoes(StatusDevolucao novoStatus, DateTime agora)
        {
            var alvo = Devolucoes
                .Where(d => d.Status != StatusDevolucao.TrocaProcessada && d.Status != StatusDevolucao.TrocaRecusada)
                .ToList();

            foreach (var d in alvo)
            {
                d.Status = novoStatus;
                d.UpdatedAt = agora;
            }

            return alvo;
        }

        // ---------- Pré-condições e efeitos internos ao agregado ----------

        private void GarantirProntoParaProcessamento()
        {
            if (!ProdutosDoPedido.Any())
                throw new DomainValidationException("O pedido não possui itens.");

            if (!EnderecoId.HasValue && Endereco == null)
                throw new DomainValidationException("O pedido não possui endereço de entrega.");

            if (!Entregas.Any())
                throw new DomainValidationException("O pedido não possui entrega registrada.");
        }

        private void AtualizarPagamentos(StatusPagamento novoStatus, DateTime agora)
        {
            foreach (var pagamento in Pagamentos)
            {
                pagamento.Status = novoStatus;
                pagamento.UpdatedAt = agora;
            }
        }

        private Entrega? AtualizarEntrega(StatusEntrega novoStatus, DateTime agora, bool obrigatoria)
        {
            var entrega = Entregas.OrderBy(e => e.Id).FirstOrDefault();
            if (entrega == null)
            {
                if (obrigatoria)
                    throw new DomainValidationException("O pedido não possui entrega registrada.");
                return null;
            }

            entrega.Status = novoStatus;
            entrega.UpdatedAt = agora;
            return entrega;
        }
    }
}