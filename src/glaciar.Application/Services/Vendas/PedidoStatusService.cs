using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    /// <summary>
    /// Orquestra a mudança de status do Pedido. NÃO contém regra de transição:
    ///   1. Busca o agregado (com filtro de dono quando o ator é o cliente);
    ///   2. Delega ao Domain (<see cref="Pedido.AlterarStatus"/>), que valida e aplica a transição;
    ///   3. Persiste o pedido (compare-and-set do status) e executa os efeitos que exigem I/O,
    ///      tudo dentro de uma única transação.
    /// </summary>
    public class PedidoStatusService : IPedidoStatusService
    {
        private readonly IPedidoRepository _pedidoRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly ICupomRepository _cupomRepository;
        private readonly IUnitOfWork _unitOfWork;

        public PedidoStatusService(
            IPedidoRepository pedidoRepository,
            IEstoqueRepository estoqueRepository,
            ICupomRepository cupomRepository,
            IUnitOfWork unitOfWork)
        {
            _pedidoRepository = pedidoRepository;
            _estoqueRepository = estoqueRepository;
            _cupomRepository = cupomRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<PedidoStatusAlteradoDTO> AlterarStatusAsync(
            int pedidoId,
            StatusPedido novoStatus,
            AtorTransicao ator,
            int? usuarioId = null)
        {
            var filtroDono = ResolverFiltroDeDono(ator, usuarioId);

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                // 1. Busca (cliente só enxerga os próprios pedidos → 404 em vez de 403, sem vazar existência)
                var pedido = await _pedidoRepository.GetParaAlteracaoStatusAsync(pedidoId, filtroDono)
                    ?? throw new EntidadeNaoEncontradaException("Pedido não encontrado.");

                // 2. Domínio valida (status anterior + ator) e aplica a transição
                var resultado = pedido.AlterarStatus(novoStatus, ator);

                // 3a. Persiste PRIMEIRO o pedido: o UPDATE com "WHERE Status = <anterior>" é o cadeado.
                //     Se outra requisição chegou antes, estoura ConflitoDeConcorrenciaException aqui
                //     e nenhum efeito colateral (estoque/cupom) é executado.
                await _pedidoRepository.UpdateAsync(pedido);

                // 3b. Efeitos com I/O decididos pelo domínio
                if (resultado.DevolverItensAoEstoque)
                {
                    foreach (var item in pedido.ProdutosDoPedido)
                        await _estoqueRepository.ReporEstoqueAsync(item.EstoqueId, item.Quantidade);
                }

                if (resultado.CupomTrocaGerado != null)
                    await _cupomRepository.AddAsync(resultado.CupomTrocaGerado);

                await _unitOfWork.CommitAsync();

                return new PedidoStatusAlteradoDTO
                {
                    PedidoId = pedido.Id,
                    Codigo = pedido.Codigo,
                    StatusAnterior = resultado.StatusAnterior,
                    StatusAtual = resultado.StatusAtual,
                    ProximosStatus = PedidoMaquinaEstados.ProximosStatus(pedido.Status, ator).ToList(),
                    CupomTrocaGerado = resultado.CupomTrocaGerado == null
                        ? null
                        : VendasMapper.ParaCupom(resultado.CupomTrocaGerado)
                };
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Regras de entrada da API:
        ///  - "Sistema" nunca pode ser disparado por HTTP (é exclusivo de fluxos internos como o checkout);
        ///  - Cliente precisa estar identificado e só altera os próprios pedidos;
        ///  - Administrador opera sobre qualquer pedido.
        /// </summary>
        private static int? ResolverFiltroDeDono(AtorTransicao ator, int? usuarioId) => ator switch
        {
            AtorTransicao.Administrador => null,
            AtorTransicao.Cliente when usuarioId is > 0 => usuarioId,
            AtorTransicao.Cliente => throw new DomainValidationException("Usuário não autenticado."),
            _ => throw new DomainValidationException("Ator não autorizado a alterar o status do pedido.")
        };
    }
}
