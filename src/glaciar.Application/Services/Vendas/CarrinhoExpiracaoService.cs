using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class CarrinhoExpiracaoService : ICarrinhoExpiracaoService
    {
        private readonly IPedidoRepository _pedidoRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CarrinhoExpiracaoService(
            IPedidoRepository pedidoRepository,
            IEstoqueRepository estoqueRepository,
            IUnitOfWork unitOfWork)
        {
            _pedidoRepository = pedidoRepository;
            _estoqueRepository = estoqueRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<bool> ExpirarSeVencidoAsync(Pedido carrinho)
        {
            var agora = DateTime.UtcNow;
            if (!carrinho.ReservaExpirada(agora)) return false;

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var removidos = carrinho.ProdutosDoPedido.ToList();
                var itensParaLiberar = carrinho.ExpirarCarrinho(agora);

                await _pedidoRepository.UpdateAsync(carrinho, removidos);

                foreach (var item in itensParaLiberar)
                {
                    await _estoqueRepository.ReporEstoqueAsync(item.EstoqueId, item.Quantidade);
                }

                await _unitOfWork.CommitAsync();
                return true;
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task<int> ExpirarVencidosAsync()
        {
            var agora = DateTime.UtcNow;
            var vencidos = await _pedidoRepository.GetCarrinhosVencidosAsync(agora);
            var totalExpirados = 0;

            foreach (var carrinho in vencidos)
            {
                try
                {
                    if (await ExpirarSeVencidoAsync(carrinho))
                    {
                        totalExpirados++;
                    }
                }
                catch (ConflitoDeConcorrenciaException)
                {
                    // Caso o cliente tenha fechado a compra ou alterado o carrinho concorrentemente
                }
                catch (Exception)
                {
                    // Logar se necessário; o próximo ciclo reavalia
                }
            }

            return totalExpirados;
        }
    }
}
