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
                    resultado.DevolverItensAoEstoque = true;
                    break;

                case StatusPedido.Cancelado:
                    AtualizarPagamentos(StatusPagamento.PagamentoCancelado, agora);
                    AtualizarEntrega(StatusEntrega.Cancelado, agora, obrigatoria: false);
                    resultado.DevolverItensAoEstoque = true;
                    break;

                case StatusPedido.EmTransporte:
                    AtualizarEntrega(StatusEntrega.EmTransporte, agora, obrigatoria: true)!.DataDespacho = agora;
                    break;

                case StatusPedido.Entregue:
                    AtualizarEntrega(StatusEntrega.Entregue, agora, obrigatoria: true)!.DataEntrega = agora;
                    break;

                case StatusPedido.Trocado:
                    var credito = CalcularValorCreditoTroca();
                    if (credito > 0m)
                        resultado.CupomTrocaGerado = Cupom.CriarCupomTroca(UsuarioId, credito);
                    break;

                // TrocaSolicitada, TrocaAceita, TrocaNegada, ItemEnviado, ItemRecebido:
                // mudança puramente de status — a validação da máquina já é suficiente.
            }

            Status = novoStatus;
            UpdatedAt = agora;
            return resultado;
        }

        /// <summary>
        /// Crédito de troca = valor dos itens − desconto PROMOCIONAL efetivamente aplicado.
        /// Frete não é reembolsado e um cupom promocional não pode ser "convertido" em crédito de troca
        /// (evita a fraude: comprar com cupom promocional → trocar → receber o valor cheio em cupom de troca).
        /// </summary>
        public decimal CalcularValorCreditoTroca()
        {
            if (!ProdutosDoPedido.Any())
                throw new DomainValidationException("Os itens do pedido não foram carregados para o cálculo do crédito de troca.");

            var subtotalItens = ProdutosDoPedido.Sum(i => i.Preco * i.Quantidade);
            var descontoPromocional = CuponsAplicados
                .Where(pc => pc.Cupom != null && !pc.Cupom.EhTroca)
                .Sum(pc => pc.Cupom.ValorDesconto);

            var credito = subtotalItens - Math.Min(descontoPromocional, subtotalItens);
            return Math.Round(credito, 2, MidpointRounding.AwayFromZero);
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