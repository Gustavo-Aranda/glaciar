using glaciar.Domain.Entities.Vendas;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IPedidoRepository
    {
        /// <summary>Retorna o Pedido "EmAberto" (carrinho) do usuário, rastreado, com itens/estoque/produto.</summary>
        Task<Pedido?> GetCarrinhoAsync(int usuarioId);

        /// <summary>Retorna um pedido finalizado do usuário com todos os detalhes (somente leitura).</summary>
        Task<Pedido?> GetByIdAsync(int usuarioId, int pedidoId);

        /// <summary>Lista os pedidos do usuário, excluindo o carrinho (EmAberto).</summary>
        Task<IEnumerable<Pedido>> GetByUsuarioAsync(int usuarioId);

        Task AddAsync(Pedido pedido);

        /// <summary>Persiste alterações em um Pedido já rastreado (inclui filhos adicionados às coleções).</summary>
        Task UpdateAsync(Pedido pedido);

        Task RemoverItemAsync(PedidoProduto item);

        /// <summary>Indica se algum pedido (não carrinho) aponta para o endereço físico informado.</summary>
        Task<bool> ExisteComEnderecoAsync(int enderecoId);
    }
}
