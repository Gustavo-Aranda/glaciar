using AutoMapper;
using glaciar.Application.DTOs.Clientes;
using glaciar.Application.DTOs.Enderecos;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Entities.Logisticas;
using glaciar.Domain.Entities.Logisticas.Enum;
using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Vendas
{
    public class CheckoutService : ICheckoutService
    {
        private const decimal ValorMinimoPorCartao = 10.00m;

        private readonly IPedidoRepository _pedidoRepository;
        private readonly ICupomRepository _cupomRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEnderecoService _enderecoService;
        private readonly ICartaoService _cartaoService;
        private readonly IFreteService _freteService;
        private readonly IMapper _mapper;

        public CheckoutService(
            IPedidoRepository pedidoRepository,
            ICupomRepository cupomRepository,
            IEstoqueRepository estoqueRepository,
            IUnitOfWork unitOfWork,
            IEnderecoService enderecoService,
            ICartaoService cartaoService,
            IFreteService freteService,
            IMapper mapper)
        {
            _pedidoRepository = pedidoRepository;
            _cupomRepository = cupomRepository;
            _estoqueRepository = estoqueRepository;
            _unitOfWork = unitOfWork;
            _enderecoService = enderecoService;
            _cartaoService = cartaoService;
            _freteService = freteService;
            _mapper = mapper;
        }

        // ==========================================
        // 1. FINALIZAR COMPRA
        // ==========================================
        public async Task<PedidoResponseDTO> FinalizarCompraAsync(int usuarioId, CheckoutRequestDTO dto)
        {
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var pedido = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
                if (pedido == null || !pedido.ProdutosDoPedido.Any())
                {
                    throw new DomainValidationException("Carrinho vazio ou não encontrado.");
                }

                // 1. Processar Endereço de Entrega
                var enderecoFisico = await ProcessarEnderecoEntregaAsync(usuarioId, dto);
                pedido.EnderecoId = enderecoFisico.Id;

                // 2. Calcular Frete e Registrar Entrega
                var totalItens = pedido.ProdutosDoPedido.Sum(p => p.Quantidade);
                var valorFrete = _freteService.Calcular(enderecoFisico.Estado, totalItens);
                AdicionarEntrega(pedido, valorFrete);

                // 3. Totais e Aplicação de Cupons
                var subtotalProdutos = pedido.ProdutosDoPedido.Sum(p => p.Preco * p.Quantidade);
                var totalDescontos = await ProcessarCuponsAsync(pedido, usuarioId, dto.CodigosCupons);

                var totalAposCupons = (subtotalProdutos + valorFrete) - totalDescontos;
                Cupom? cupomTrocaGerado = null;

                if (totalAposCupons < 0)
                {
                    var troco = Math.Abs(totalAposCupons);
                    cupomTrocaGerado = await GerarCupomTrocaAsync(usuarioId, troco);
                    totalAposCupons = 0;
                }

                pedido.ValorTotal = subtotalProdutos + valorFrete;

                // 4. Processar Pagamento (Cartões de Crédito)
                if (totalAposCupons > 0)
                {
                    await ProcessarPagamentosAsync(pedido, usuarioId, dto.Cartoes, totalAposCupons);
                }

                // 5. Baixa de Estoque
                await ProcessarBaixaEstoqueAsync(pedido);

                // 6. Transição de Status e Persistência
                pedido.Status = StatusPedido.EmProcessamento;
                pedido.UpdatedAt = DateTime.UtcNow;

                await _pedidoRepository.UpdateAsync(pedido);
                await _unitOfWork.CommitAsync();

                return VendasMapper.ParaPedido(pedido, cupomTrocaGerado);
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        // ==========================================
        // 2. OBTER CONTEXTO (FEAT NOVA)
        // ==========================================
        public async Task<CheckoutContextoDTO> ObterContextoAsync(int usuarioId)
        {
            // 1. Carrinho e itens
            var carrinho = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
            var carrinhoDto = VendasMapper.ParaCarrinho(carrinho);

            // 2. Endereço principal do cliente
            var enderecos = await _enderecoService.GetEnderecoClienteAsync(usuarioId);
            var enderecoPrincipal = enderecos.FirstOrDefault(e => e.Padrao) ?? enderecos.FirstOrDefault();

            // 3. Frete e total inicial
            decimal valorFrete = 0m;
            if (enderecoPrincipal?.Endereco != null && carrinhoDto.QuantidadeItens > 0)
            {
                valorFrete = _freteService.Calcular(enderecoPrincipal.Endereco.Estado, carrinhoDto.QuantidadeItens);
            }

            var valorTotal = carrinhoDto.Subtotal + valorFrete;

            // 4. Cartões cadastrados do cliente
            var cartoes = await _cartaoService.GetByUsuarioAsync(usuarioId);
            var cartoesDto = _mapper.Map<IEnumerable<CartaoResponseDTO>>(cartoes);

            return new CheckoutContextoDTO
            {
                Carrinho = carrinhoDto,
                EnderecoPrincipal = enderecoPrincipal,
                ValorFrete = valorFrete,
                ValorTotal = valorTotal,
                Cartoes = cartoesDto
            };
        }

        // ==========================================
        // 🔒 MÉTODOS PRIVADOS AUXILIARES
        // ==========================================
        private async Task<EnderecoResponseDTO> ProcessarEnderecoEntregaAsync(int usuarioId, CheckoutRequestDTO dto)
        {
            if (dto.UsuarioEnderecoId.HasValue)
            {
                return await _enderecoService.ObterEnderecoDoClienteAsync(usuarioId, dto.UsuarioEnderecoId.Value);
            }

            if (dto.NovoEndereco != null)
            {
                return await _enderecoService.RegistrarEnderecoDeEntregaAsync(new EnderecoCreateDTO
                {
                    UsuarioId = usuarioId,
                    Apelido = dto.NovoEndereco.Apelido,
                    Cep = dto.NovoEndereco.Cep,
                    Logradouro = dto.NovoEndereco.Logradouro,
                    Numero = dto.NovoEndereco.Numero,
                    Complemento = dto.NovoEndereco.Complemento,
                    Bairro = dto.NovoEndereco.Bairro,
                    Cidade = dto.NovoEndereco.Cidade,
                    Estado = dto.NovoEndereco.Estado
                }, dto.NovoEndereco.SalvarNoPerfil);
            }

            throw new DomainValidationException("Endereço de entrega não informado.");
        }

        private static void AdicionarEntrega(Pedido pedido, decimal valorFrete)
        {
            pedido.Entregas.Add(new Entrega
            {
                ValorFrete = valorFrete,
                CodigoRastreamento = "AGUARDANDO",
                Status = StatusEntrega.EmProcessamento,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        private async Task<decimal> ProcessarCuponsAsync(Pedido pedido, int usuarioId, IEnumerable<string> codigosCupons)
        {
            decimal totalDescontos = 0;
            int countPromocionais = 0;

            pedido.CuponsAplicados.Clear();

            foreach (var codigo in codigosCupons)
            {
                var cupom = await _cupomRepository.GetByCodigoAsync(codigo);
                CupomRegras.ValidarUso(cupom, usuarioId, codigo);

                if (CupomRegras.EhPromocional(cupom!))
                {
                    countPromocionais++;
                    if (countPromocionais > 1)
                    {
                        throw new DomainValidationException("Apenas um cupom promocional pode ser usado por pedido.");
                    }
                }

                pedido.CuponsAplicados.Add(new PedidoCupom
                {
                    CupomId = cupom!.Id,
                    PedidoId = pedido.Id,
                    Pedido = pedido
                });

                cupom.QuantidadeMaximaUso--;
                totalDescontos += cupom.ValorDesconto;
            }

            return totalDescontos;
        }

        private async Task<Cupom> GerarCupomTrocaAsync(int usuarioId, decimal troco)
        {
            var cupomTroca = new Cupom
            {
                Codigo = $"TROCA-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                ValorDesconto = troco,
                DataValidade = DateTime.UtcNow.AddYears(1),
                CategoriaCupom = CategoriasCupom.Troca,
                Ativo = true,
                QuantidadeMaximaUso = 1,
                UsuarioId = usuarioId
            };

            await _cupomRepository.AddAsync(cupomTroca);
            return cupomTroca;
        }

        private async Task ProcessarPagamentosAsync(Pedido pedido, int usuarioId, List<CheckoutCartaoDTO> cartoes, decimal saldoDevedor)
        {
            if (cartoes == null || !cartoes.Any())
            {
                throw new DomainValidationException("Nenhum cartão informado para o saldo devedor.");
            }

            // Validação prévia (Fail-Fast): garante integridade antes de persistir dados
            var somaValores = cartoes.Sum(c => c.Valor);
            if (somaValores < saldoDevedor)
            {
                throw new DomainValidationException($"O valor dos cartões (R$ {somaValores:F2}) é inferior ao saldo devedor (R$ {saldoDevedor:F2}).");
            }

            foreach (var c in cartoes)
            {
                if (c.Valor < ValorMinimoPorCartao)
                {
                    throw new DomainValidationException($"O valor mínimo em cada cartão de crédito é R$ {ValorMinimoPorCartao:F2}.");
                }

                int? usuarioCartaoId = c.UsuarioCartaoId;
                if (c.NovoCartao != null && c.NovoCartao.SalvarNoPerfil)
                {
                    var novoUsuarioCartao = await _cartaoService.CreateAsync(new CartaoCreateDTO
                    {
                        UsuarioId = usuarioId,
                        Numero = c.NovoCartao.Numero,
                        Cvv = c.NovoCartao.Cvv,
                        Bandeira = c.NovoCartao.Bandeira,
                        MesValidade = c.NovoCartao.MesValidade,
                        AnoValidade = c.NovoCartao.AnoValidade
                    });
                    usuarioCartaoId = novoUsuarioCartao.Id;
                }

                pedido.Pagamentos.Add(new Pagamento
                {
                    Valor = c.Valor,
                    Status = StatusPagamento.PagamentoRealizado,
                    Metodo = MetodoPagamento.Credito,
                    Data = DateOnly.FromDateTime(DateTime.UtcNow),
                    QuantidadeParcelas = 1,
                    UsuarioCartaoId = usuarioCartaoId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        private async Task ProcessarBaixaEstoqueAsync(Pedido pedido)
        {
            foreach (var item in pedido.ProdutosDoPedido)
            {
                var baixou = await _estoqueRepository.BaixarEstoqueAsync(item.EstoqueId, item.Quantidade);
                if (!baixou)
                {
                    throw new DomainValidationException(
                        $"Estoque insuficiente para o item {item.Estoque?.Produto?.Nome} " +
                        $"(Tamanho: {item.Estoque?.Tamanho}, Cor: {item.Estoque?.Cor}).");
                }
            }
        }
    }
}
