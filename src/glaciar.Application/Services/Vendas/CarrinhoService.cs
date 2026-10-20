using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Entities.Catalogos;
using glaciar.Domain.Entities.Clientes.Enum;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class CarrinhoService : ICarrinhoService
    {
        private readonly IPedidoRepository _pedidoRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly IFreteService _freteService;
        private readonly ICarrinhoExpiracaoService _expiracaoService;
        private readonly IUnitOfWork _unitOfWork;

        public CarrinhoService(
            IPedidoRepository pedidoRepository,
            IEstoqueRepository estoqueRepository,
            IFreteService freteService,
            ICarrinhoExpiracaoService expiracaoService,
            IUnitOfWork unitOfWork)
        {
            _pedidoRepository = pedidoRepository;
            _estoqueRepository = estoqueRepository;
            _freteService = freteService;
            _expiracaoService = expiracaoService;
            _unitOfWork = unitOfWork;
        }

        // ==========================================
        // READ
        // ==========================================
        public async Task<CarrinhoResponseDTO> ObterAsync(int usuarioId)
        {
            var carrinho = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
            if (carrinho != null)
            {
                await _expiracaoService.ExpirarSeVencidoAsync(carrinho);
            }

            return VendasMapper.ParaCarrinho(carrinho);
        }

        // ==========================================
        // ADICIONAR
        // ==========================================
        public async Task<CarrinhoResponseDTO> AdicionarItemAsync(int usuarioId, CarrinhoItemAddDTO dto)
        {
            ValidarQuantidadeInformada(dto.Quantidade);

            var estoque = await ObterEstoqueVendavelAsync(dto.EstoqueId);
            estoque.GarantirDisponivel(dto.Quantidade);

            var carrinho = await ObterOuCriarCarrinhoAsync(usuarioId);
            await _expiracaoService.ExpirarSeVencidoAsync(carrinho);

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                // Desconto atômico imediato no estoque físico (Quantidade)
                var baixou = await _estoqueRepository.BaixarEstoqueAsync(estoque.Id, dto.Quantidade);
                if (!baixou)
                {
                    throw new DomainValidationException(
                        $"Quantidade indisponível para '{estoque.Produto.Nome}' ({estoque.Cor}, {estoque.Tamanho}).");
                }

                var itemExistente = carrinho.ProdutosDoPedido.FirstOrDefault(i => i.EstoqueId == dto.EstoqueId);
                var quantidadeFinal = (itemExistente?.Quantidade ?? 0) + dto.Quantidade;

                if (itemExistente != null)
                {
                    itemExistente.Quantidade = quantidadeFinal;
                    itemExistente.Preco = estoque.Produto.Preco;
                }
                else
                {
                    carrinho.ProdutosDoPedido.Add(new PedidoProduto
                    {
                        EstoqueId = estoque.Id,
                        Estoque = estoque,
                        Quantidade = quantidadeFinal,
                        Preco = estoque.Produto.Preco
                    });
                }

                // Inicia ou mantém a reserva de 15 minutos
                carrinho.IniciarOuManterReserva(DateTime.UtcNow);
                RecalcularCarrinho(carrinho);

                await _pedidoRepository.UpdateAsync(carrinho);
                await _unitOfWork.CommitAsync();

                return VendasMapper.ParaCarrinho(carrinho);
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        // ==========================================
        // SINCRONIZAR (lote enviado ao seguir para o checkout)
        // ==========================================
        public async Task<CarrinhoResponseDTO> SincronizarItensAsync(int usuarioId, CarrinhoSincronizarDTO dto)
        {
            ValidarLote(dto);

            var carrinho = await ObterCarrinhoExistenteAsync(usuarioId);
            await _expiracaoService.ExpirarSeVencidoAsync(carrinho);

            if (carrinho.CarrinhoExpiradoEm.HasValue)
            {
                throw new DomainValidationException("O tempo de reserva do carrinho esgotou. Adicione os itens novamente.");
            }

            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var itensRemovidos = new List<PedidoProduto>();

                foreach (var alteracao in dto.Itens)
                {
                    var item = ObterItemDoCarrinho(carrinho, alteracao.ItemId);
                    var delta = alteracao.Quantidade - item.Quantidade;

                    if (delta > 0)
                    {
                        // Desconta unidades a mais no estoque físico
                        var baixou = await _estoqueRepository.BaixarEstoqueAsync(item.EstoqueId, delta);
                        if (!baixou)
                        {
                            throw new DomainValidationException(
                                $"Quantidade adicional indisponível para '{item.Estoque?.Produto?.Nome}'.");
                        }
                    }
                    else if (delta < 0)
                    {
                        // Devolve ao estoque físico as unidades reduzidas/removidas
                        await _estoqueRepository.ReporEstoqueAsync(item.EstoqueId, -delta);
                    }

                    if (alteracao.Quantidade == 0)
                    {
                        itensRemovidos.Add(item);
                    }
                    else
                    {
                        item.Quantidade = alteracao.Quantidade;
                    }
                }

                foreach (var item in itensRemovidos)
                {
                    carrinho.ProdutosDoPedido.Remove(item);
                }

                // Congela os preços oficiais vigentes
                foreach (var item in carrinho.ProdutosDoPedido)
                {
                    ValidarEstoqueVendavel(item.Estoque);
                    item.Preco = item.Estoque.Produto.Preco;
                }

                RecalcularCarrinho(carrinho);

                // Se todos os itens foram removidos, zera a reserva
                if (!carrinho.ProdutosDoPedido.Any())
                {
                    carrinho.ExpirarCarrinho(DateTime.UtcNow);
                }

                await _pedidoRepository.UpdateAsync(carrinho, itensRemovidos);
                await _unitOfWork.CommitAsync();

                return VendasMapper.ParaCarrinho(carrinho);
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        // ==========================================
        // FRETE (cotação para exibir no carrinho/checkout)
        // ==========================================
        public async Task<FreteResponseDTO> CalcularFreteAsync(int usuarioId, Estados estado)
        {
            if (!Enum.IsDefined(estado))
                throw new DomainValidationException("O estado de destino é inválido.");

            var carrinho = await ObterCarrinhoExistenteAsync(usuarioId);
            var unidades = carrinho.ProdutosDoPedido.Sum(i => i.Quantidade);

            return new FreteResponseDTO
            {
                Estado = estado,
                QuantidadeItens = unidades,
                Valor = _freteService.Calcular(estado, unidades)
            };
        }

        // ==========================================
        // 🔒 MÉTODOS PRIVADOS
        // ==========================================
        private static void ValidarQuantidadeInformada(int quantidade)
        {
            if (quantidade < 1)
                throw new DomainValidationException("A quantidade deve ser de no mínimo 1 unidade.");
        }

        private static void ValidarLote(CarrinhoSincronizarDTO? dto)
        {
            if (dto?.Itens == null || dto.Itens.Count == 0)
                throw new DomainValidationException("Nenhuma alteração de item foi informada.");

            if (dto.Itens.Any(i => i.Quantidade < 0))
                throw new DomainValidationException("A quantidade não pode ser negativa.");

            if (dto.Itens.GroupBy(i => i.ItemId).Any(g => g.Count() > 1))
                throw new DomainValidationException("O mesmo item foi informado mais de uma vez.");
        }

        private async Task<Estoque> ObterEstoqueVendavelAsync(int estoqueId)
        {
            var estoque = await _estoqueRepository.GetByIdComProdutoAsync(estoqueId);
            ValidarEstoqueVendavel(estoque);
            return estoque!;
        }

        private static void ValidarEstoqueVendavel(Estoque? estoque)
        {
            if (estoque == null || estoque.Produto == null)
                throw new DomainValidationException("O produto selecionado não existe.");

            if (!estoque.Produto.Visivel || estoque.Quantidade <= 0)
                throw new DomainValidationException($"O produto '{estoque.Produto.Nome}' ({estoque.Cor}, {estoque.Tamanho}) está indisponível.");
        }

        private async Task<Pedido> ObterOuCriarCarrinhoAsync(int usuarioId)
        {
            var carrinho = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
            if (carrinho != null) return carrinho;

            var agora = DateTime.UtcNow;
            carrinho = new Pedido
            {
                UsuarioId = usuarioId,
                Codigo = GerarCodigoPedido(agora),
                Data = agora,
                ValorTotal = 0m,
                CreatedAt = agora,
                UpdatedAt = agora
            };

            await _pedidoRepository.AddAsync(carrinho);
            return carrinho;
        }

        private async Task<Pedido> ObterCarrinhoExistenteAsync(int usuarioId)
        {
            var carrinho = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
            if (carrinho == null || !carrinho.ProdutosDoPedido.Any())
                throw new DomainValidationException("O carrinho está vazio.");

            return carrinho;
        }

        private static PedidoProduto ObterItemDoCarrinho(Pedido carrinho, int itemId)
        {
            var item = carrinho.ProdutosDoPedido.FirstOrDefault(i => i.Id == itemId);
            if (item == null)
                throw new DomainValidationException("Item não encontrado no carrinho.");

            return item;
        }

        private static void RecalcularCarrinho(Pedido carrinho)
        {
            carrinho.ValorTotal = carrinho.ProdutosDoPedido.Sum(i => i.Preco * i.Quantidade);
            carrinho.UpdatedAt = DateTime.UtcNow;
        }

        internal static string GerarCodigoPedido(DateTime agora) =>
            $"GLC-{agora:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }
}
