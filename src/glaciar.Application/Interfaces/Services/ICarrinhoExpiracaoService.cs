using glaciar.Domain.Entities.Vendas;

namespace glaciar.Application.Interfaces.Services
{
    public interface ICarrinhoExpiracaoService
    {
        /// <summary>
        /// Se o carrinho estiver com a reserva vencida, esvazia os itens, devolve a reserva ao estoque
        /// e marca o carrinho como expirado. Retorna true se foi expirado.
        /// </summary>
        Task<bool> ExpirarSeVencidoAsync(Pedido carrinho);

        /// <summary>
        /// Varre o banco em busca de carrinhos com reserva vencida e realiza a expiração atômica.
        /// Retorna a quantidade de carrinhos processados.
        /// </summary>
        Task<int> ExpirarVencidosAsync();
    }
}
