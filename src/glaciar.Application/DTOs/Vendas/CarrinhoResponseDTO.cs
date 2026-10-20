namespace glaciar.Application.DTOs.Vendas
{
    public class CarrinhoResponseDTO
    {
        /// <summary>Id do Pedido "EmAberto" que representa o carrinho. Null se o carrinho ainda não existe.</summary>
        public int? PedidoId { get; set; }
        public List<CarrinhoItemResponseDTO> Itens { get; set; } = new();
        public int QuantidadeItens { get; set; }
        public decimal Subtotal { get; set; }

        /// <summary>True se algum item precisa de ajuste antes do checkout.</summary>
        public bool PossuiItensIndisponiveis { get; set; }

        /// <summary>Data e hora UTC em que a reserva de estoque do carrinho expira.</summary>
        public DateTime? ExpiraEm { get; set; }

        /// <summary>Tempo restante em segundos para a expiração da reserva.</summary>
        public int? SegundosRestantes { get; set; }

        /// <summary>Indica se faltam 5 minutos ou menos para a reserva expirar (alerta prévio ao usuário).</summary>
        public bool ExibirAvisoExpiracao { get; set; }

        /// <summary>Indica se a reserva do carrinho expirou e os itens foram devolvidos ao estoque físico.</summary>
        public bool Expirado { get; set; }

        /// <summary>Define se o botão de finalização de compra deve estar ativo (itens presentes e reserva vigente).</summary>
        public bool CompraHabilitada { get; set; }
    }
}
