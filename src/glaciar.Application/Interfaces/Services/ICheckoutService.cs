using glaciar.Application.DTOs.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface ICheckoutService
    {
        /// <summary>
        /// Converte o carrinho (Pedido EmAberto) do usuário em um pedido "EmProcessamento",
        /// aplicando endereço, frete, cupons e pagamentos com cartão de forma atômica.
        /// </summary>
        Task<PedidoResponseDTO> FinalizarCompraAsync(int usuarioId, CheckoutRequestDTO dto);

        /// <summary>
        /// Retorna todos os dados agregados necessários para a inicialização da tela de checkout
        /// (carrinho, endereço principal, frete estimado, total e cartões vinculados).
        /// </summary>
        Task<CheckoutContextoDTO> ObterContextoAsync(int usuarioId);
    }
}
