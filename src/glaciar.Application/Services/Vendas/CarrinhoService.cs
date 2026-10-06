using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Entities.Catalogos;
using glaciar.Domain.Entities.Clientes.Enum;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class CarrinhoService : ICarrinhoService
    {
        private readonly IPedidoRepository _pedidoRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly IFreteService _freteService;

        public CarrinhoService(
            IPedidoRepository pedidoRepository,
            IEstoqueRepository estoqueRepository,
            IFreteService freteService)
        {
            _pedidoRepository = pedidoRepository;
            _estoqueRepository = estoqueRepository;
            _freteService = freteService;
        }

        // ==========================================
        // READ
        // ==========================================
        public async Task<CarrinhoResponseDTO> ObterAsync(int usuarioId)
        {
            var carrinho = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
            return VendasMapper.ParaCarrinho(carrinho);
        }

        // ==========================================
        // ADICIONAR
        // ==========================================
        public async Task<CarrinhoResponseDTO> AdicionarItemAsync(int usuarioId, CarrinhoItemAddDTO dto)
        {
            ValidarQuantidadeInformada(dto.Quantidade);

            var estoque = await ObterEstoqueVendavelAsync(dto.EstoqueId);
            var carrinho = await ObterOuCriarCarrinhoAsync(usuarioId);

            var itemExistente = carrinho.ProdutosDoPedido.FirstOrDefault(i => i.EstoqueId == dto.EstoqueId);
            var quantidadeFinal = (itemExistente?.Quantidade ?? 0) + dto.Quantidade;

            ValidarQuantidadeContraEstoque(estoque, quantidadeFinal);

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

            RecalcularCarrinho(carrinho);
            await _pedidoRepository.UpdateAsync(carrinho);

            return VendasMapper.ParaCarrinho(carrinho);
        }

        // ==========================================
        // SINCRONIZAR (lote enviado ao seguir para o checkout)
        // ==========================================
        public async Task<CarrinhoResponseDTO> SincronizarItensAsync(int usuarioId, CarrinhoSincronizarDTO dto)
        {
            ValidarLote(dto);

            // 1 único SELECT: o carrinho já vem com Itens -> Estoque -> Produto.
            var carrinho = await ObterCarrinhoExistenteAsync(usuarioId);
            var itensRemovidos = new List<PedidoProduto>();

            foreach (var alteracao in dto.Itens)
            {
                var item = ObterItemDoCarrinho(carrinho, alteracao.ItemId);

                if (alteracao.Quantidade == 0)
                    itensRemovidos.Add(item);
                else
                    item.Quantidade = alteracao.Quantidade;
            }

            foreach (var item in itensRemovidos)
                carrinho.ProdutosDoPedido.Remove(item);

            // O backend é a fonte da verdade: revalida todo o carrinho que vai para o checkout
            // e congela o preço oficial vigente, ignorando qualquer cálculo feito no front.
            foreach (var item in carrinho.ProdutosDoPedido)
            {
                ValidarEstoqueVendavel(item.Estoque);
                ValidarQuantidadeContraEstoque(item.Estoque, item.Quantidade);
                item.Preco = item.Estoque.Produto.Preco;
            }

            RecalcularCarrinho(carrinho);

            // 1 único SaveChanges (transação): atualizações + exclusões, tudo ou nada.
            await _pedidoRepository.UpdateAsync(carrinho, itensRemovidos);

            return VendasMapper.ParaCarrinho(carrinho);
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

        private static void ValidarQuantidadeContraEstoque(Estoque estoque, int quantidadeDesejada)
        {
            if (quantidadeDesejada > estoque.Quantidade)
                throw new DomainValidationException(
                    $"Quantidade indisponível para '{estoque.Produto.Nome}' ({estoque.Cor}, {estoque.Tamanho}). " +
                    $"Estoque atual: {estoque.Quantidade} unidade(s).");
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
                Status = StatusPedido.EmAberto,
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

        /// <summary>No carrinho, ValorTotal guarda apenas o subtotal dos itens (frete entra no checkout).</summary>
        private static void RecalcularCarrinho(Pedido carrinho)
        {
            carrinho.ValorTotal = carrinho.ProdutosDoPedido.Sum(i => i.Preco * i.Quantidade);
            carrinho.UpdatedAt = DateTime.UtcNow;
        }

        internal static string GerarCodigoPedido(DateTime agora) =>
            $"GLC-{agora:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }
}
