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
    ///   2. Delega ao Domain (<see cref="Pedido.AlterarStatus"/> ou <see cref="Pedido.SolicitarTroca"/>), que valida e aplica a transição;
    ///   3. Persiste o pedido (compare-and-set do status) e executa os efeitos que exigem I/O
    ///      (reentrada no estoque, emissão de cupom, envio de notificações),
    ///      tudo dentro de uma única transação atômica.
    /// </summary>
    public class PedidoStatusService : IPedidoStatusService
    {
        private readonly IPedidoRepository _pedidoRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly ICupomRepository _cupomRepository;
        private readonly INotificacaoRepository _notificacaoRepository;
        private readonly IUnitOfWork _unitOfWork;

        public PedidoStatusService(
            IPedidoRepository pedidoRepository,
            IEstoqueRepository estoqueRepository,
            ICupomRepository cupomRepository,
            INotificacaoRepository notificacaoRepository,
            IUnitOfWork unitOfWork)
        {
            _pedidoRepository = pedidoRepository;
            _estoqueRepository = estoqueRepository;
            _cupomRepository = cupomRepository;
            _notificacaoRepository = notificacaoRepository;
            _unitOfWork = unitOfWork;
        }

        public Task<PedidoStatusAlteradoDTO> AlterarStatusAsync(
            int pedidoId,
            StatusPedido novoStatus,
            AtorTransicao ator,
            int? usuarioId = null)
        {
            var filtroDono = ResolverFiltroDeDono(ator, usuarioId);
            return ExecutarTransicaoAsync(
                pedidoId,
                filtroDono,
                ator,
                pedido => pedido.AlterarStatus(novoStatus, ator));
        }

        public Task<PedidoStatusAlteradoDTO> SolicitarTrocaAsync(
            int pedidoId,
            int usuarioId,
            SolicitarTrocaDTO dto)
        {
            if (usuarioId <= 0)
                throw new DomainValidationException("Usuário não autenticado.");

            var itensDominio = dto.Itens?
                .Select(i => new ItemTroca(i.PedidoProdutoId, i.Quantidade))
                .ToList();

            return ExecutarTransicaoAsync(
                pedidoId,
                usuarioId,
                AtorTransicao.Cliente,
                pedido => pedido.SolicitarTroca(itensDominio, dto.Motivo));
        }

        private async Task<PedidoStatusAlteradoDTO> ExecutarTransicaoAsync(
            int pedidoId,
            int? filtroDono,
            AtorTransicao ator,
            Func<Pedido, ResultadoTransicaoPedido> acaoTransicao)
        {
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                // 1. Busca (cliente só enxerga os próprios pedidos → 404 em vez de 403, sem vazar existência)
                var pedido = await _pedidoRepository.GetParaAlteracaoStatusAsync(pedidoId, filtroDono)
                    ?? throw new EntidadeNaoEncontradaException("Pedido não encontrado.");

                // 2. Domínio valida e aplica os efeitos internos
                var resultado = acaoTransicao(pedido);

                // 3a. Persiste PRIMEIRO o pedido: o UPDATE com "WHERE Status = <anterior>" é o cadeado de concorrência.
                await _pedidoRepository.UpdateAsync(pedido);

                // 3b. Efeitos colaterais com I/O decididos pelo domínio
                foreach (var item in resultado.ItensParaReposicao)
                {
                    await _estoqueRepository.ReporEstoqueAsync(item.EstoqueId, item.Quantidade);
                }

                if (resultado.CupomTrocaGerado != null)
                {
                    await _cupomRepository.AddAsync(resultado.CupomTrocaGerado);
                }

                if (resultado.Notificacao != null)
                {
                    await _notificacaoRepository.AddAsync(resultado.Notificacao);
                }

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
