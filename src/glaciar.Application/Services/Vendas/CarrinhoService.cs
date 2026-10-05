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
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IFreteService _freteService;

        public CarrinhoService(
            IPedidoRepository pedidoRepository,
            IEstoqueRepository estoqueRepository,
            IUsuarioRepository usuarioRepository,
            IFreteService freteService)
        {
            _pedidoRepository = pedidoRepository;
            _estoqueRepository = estoqueRepository;
            _usuarioRepository = usuarioRepository;
            _freteService = freteService;
        }

        // ==========================================
        // READ
        // ==========================================
        public async Task<CarrinhoResponseDTO> ObterAsync(int usuarioId)
        {
            await ValidarUsuarioAsync(usuarioId);
            var carrinho = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
            return VendasMapper.ParaCarrinho(carrinho);
        }

        // ==========================================
        // ADICIONAR
        // ==========================================
        public async Task<CarrinhoResponseDTO> AdicionarItemAsync(int usuarioId, CarrinhoItemAddDTO dto)
        {
            await ValidarUsuarioAsync(usuarioId);
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
        // ALTERAR QUANTIDADE
        // ==========================================
        public async Task<CarrinhoResponseDTO> AtualizarItemAsync(int usuarioId, int itemId, CarrinhoItemUpdateDTO dto)
        {
            await ValidarUsuarioAsync(usuarioId);
            ValidarQuantidadeInformada(dto.Quantidade);

            var carrinho = await ObterCarrinhoExistenteAsync(usuarioId);
            var item = ObterItemDoCarrinho(carrinho, itemId);

            var estoque = await ObterEstoqueVendavelAsync(item.EstoqueId);
            ValidarQuantidadeContraEstoque(estoque, dto.Quantidade);

            item.Quantidade = dto.Quantidade;
            item.Preco = estoque.Produto.Preco;

            RecalcularCarrinho(carrinho);
            await _pedidoRepository.UpdateAsync(carrinho);

            return VendasMapper.ParaCarrinho(carrinho);
        }

        // ==========================================
        // REMOVER
        // ==========================================
        public async Task<CarrinhoResponseDTO> RemoverItemAsync(int usuarioId, int itemId)
        {
            await ValidarUsuarioAsync(usuarioId);

            var carrinho = await ObterCarrinhoExistenteAsync(usuarioId);
            var item = ObterItemDoCarrinho(carrinho, itemId);

            carrinho.ProdutosDoPedido.Remove(item);
            await _pedidoRepository.RemoverItemAsync(item);

            RecalcularCarrinho(carrinho);
            await _pedidoRepository.UpdateAsync(carrinho);

            return VendasMapper.ParaCarrinho(carrinho);
        }

        // ==========================================
        // FRETE (cotação para exibir no carrinho/checkout)
        // ==========================================
        public async Task<FreteResponseDTO> CalcularFreteAsync(int usuarioId, Estados estado)
        {
            await ValidarUsuarioAsync(usuarioId);

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
        private async Task ValidarUsuarioAsync(int usuarioId)
        {
            var usuario = await _usuarioRepository.GetByIdAsync(usuarioId);
            if (usuario == null || !usuario.Ativo)
                throw new DomainValidationException("O cliente informado não existe ou está inativo.");
        }

        private static void ValidarQuantidadeInformada(int quantidade)
        {
            if (quantidade < 1)
                throw new DomainValidationException("A quantidade deve ser de no mínimo 1 unidade.");
        }

        private async Task<Estoque> ObterEstoqueVendavelAsync(int estoqueId)
        {
            var estoque = await _estoqueRepository.GetByIdComProdutoAsync(estoqueId);

            if (estoque == null || estoque.Produto == null)
                throw new DomainValidationException("O produto selecionado não existe.");

            if (!estoque.Produto.Visivel || estoque.Quantidade <= 0)
                throw new DomainValidationException($"O produto '{estoque.Produto.Nome}' ({estoque.Cor}, {estoque.Tamanho}) está indisponível.");

            return estoque;
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
