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
                var totalCompra = subtotalProdutos + valorFrete;

                var resultadoCupons = await ProcessarCuponsAsync(pedido, usuarioId, dto.CodigosCupons, totalCompra);

                // Deduz o valor dos cupons aplicados no valor total do pedido (saldo final a pagar)
                pedido.ValorTotal = resultadoCupons.SaldoDevedor;

                // 4. Processar Pagamento via Cartões
                if (resultadoCupons.SaldoDevedor > 0)
                {
                    await ProcessarPagamentosAsync(
                        pedido,
                        usuarioId,
                        dto.Cartoes,
                        resultadoCupons.SaldoDevedor,
                        resultadoCupons.HouveCuponsAplicados);
                }
                else
                {
                    ValidarPagamentoZeradoComCupom(pedido, resultadoCupons, dto.Cartoes);
                }

                // 5. Baixa de Estoque
                await ProcessarBaixaEstoqueAsync(pedido);

                // 6. Transição de Status e Persistência
                pedido.Status = StatusPedido.EmProcessamento;
                pedido.UpdatedAt = DateTime.UtcNow;

                await _pedidoRepository.UpdateAsync(pedido);
                await _unitOfWork.CommitAsync();

                return VendasMapper.ParaPedido(pedido, resultadoCupons.CupomTrocaGerado);
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        // ==========================================
        // 2. OBTER CONTEXTO
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

        // ==========================================
        // 🔒 PROCESSAMENTO DE CUPONS
        // ==========================================

        /// <summary>
        /// Orquestra a busca, validação e persistência dos cupons, delegando todas as regras
        /// de negócio para a classe de domínio puro CupomRegras.
        /// </summary>
        private async Task<ResultadoProcessamentoCupons> ProcessarCuponsAsync(
            Pedido pedido,
            int usuarioId,
            IEnumerable<string>? codigosCupons,
            decimal valorTotalCompra)
        {
            pedido.CuponsAplicados.Clear();

            // 1. Normalização e validação de duplicidade
            var codigosLimpos = CupomRegras.NormalizarEValidarCodigos(codigosCupons);
            if (!codigosLimpos.Any())
            {
                return new ResultadoProcessamentoCupons { SaldoDevedor = valorTotalCompra };
            }

            // 2. Consulta ao banco de dados e validação de elegibilidade
            var cuponsCarregados = new List<Cupom>();
            foreach (var codigo in codigosLimpos)
            {
                var cupom = await _cupomRepository.GetByCodigoAsync(codigo);
                CupomRegras.ValidarUso(cupom, usuarioId, codigo);
                cuponsCarregados.Add(cupom!);
            }

            // 3. Separação de categorias (máximo 1 promocional)
            var (cupomPromocional, cuponsTroca) = CupomRegras.SepararEValidarCategorias(cuponsCarregados);

            // 4. Cálculo progressivo, proibição de cupons desnecessários e cálculo de troco
            var plano = CupomRegras.CalcularAbatimento(valorTotalCompra, cupomPromocional, cuponsTroca);

            // 5. Associação dos cupons no pedido e decremento de uso
            foreach (var cupom in plano.CuponsUtilizados)
            {
                pedido.CuponsAplicados.Add(new PedidoCupom
                {
                    CupomId = cupom.Id,
                    PedidoId = pedido.Id,
                    Pedido = pedido,
                    Cupom = cupom
                });
                cupom.QuantidadeMaximaUso--;
            }

            // 6. Persistência do novo cupom de troca caso haja troco
            Cupom? cupomTrocaGerado = null;
            if (plano.TemTroco)
            {
                cupomTrocaGerado = CupomRegras.CriarCupomTroca(usuarioId, plano.ValorTrocoGerado);
                await _cupomRepository.AddAsync(cupomTrocaGerado);
            }

            return new ResultadoProcessamentoCupons
            {
                SaldoDevedor = plano.SaldoDevedor,
                TotalDescontosAplicados = plano.TotalDescontosAplicados,
                CupomTrocaGerado = cupomTrocaGerado,
                CuponsAplicados = plano.CuponsUtilizados
            };
        }

        // ==========================================
        // 🔒 PROCESSAMENTO DE CARTÕES
        // ==========================================

        /// <summary>
        /// Valida múltiplos cartões, exigindo valor mínimo de R$ 10,00 por cartão,
        /// com exceção permitida apenas quando há cupons aplicados e o saldo restante é inferior a R$ 10,00.
        /// </summary>
        private async Task ProcessarPagamentosAsync(
            Pedido pedido,
            int usuarioId,
            List<CheckoutCartaoDTO>? cartoes,
            decimal saldoDevedor,
            bool houveCuponsAplicados)
        {
            if (cartoes == null || !cartoes.Any())
            {
                throw new DomainValidationException("Nenhum cartão informado para o pagamento do saldo devedor restante.");
            }

            var somaValores = cartoes.Sum(c => c.Valor);

            // Valida se o total nos cartões cobre exatamente o saldo devedor
            if (Math.Round(somaValores, 2) != Math.Round(saldoDevedor, 2))
            {
                throw new DomainValidationException(
                    $"O valor total nos cartões (R$ {somaValores:F2}) não confere com o saldo devedor restante (R$ {saldoDevedor:F2}).");
            }

            // Se combinou cupons e o saldo restante for < R$ 10,00, permite cartão < R$ 10,00
            bool permiteValorAbaixoDeDez = houveCuponsAplicados && (saldoDevedor < ValorMinimoPorCartao);

            foreach (var c in cartoes)
            {
                if (c.Valor <= 0m)
                {
                    throw new DomainValidationException("O valor a ser cobrado em cada cartão deve ser maior que zero.");
                }

                // Validação de valor mínimo de R$ 10,00 por cartão
                if (!permiteValorAbaixoDeDez && c.Valor < ValorMinimoPorCartao)
                {
                    throw new DomainValidationException(
                        $"O valor mínimo debitado em cada cartão de crédito deve ser de R$ {ValorMinimoPorCartao:F2}. O valor informado de R$ {c.Valor:F2} não é permitido.");
                }

                // Validação cadastral do cartão
                if (c.NovoCartao != null)
                {
                    _cartaoService.ValidarCartao(
                        c.NovoCartao.Numero,
                        c.NovoCartao.Cvv,
                        c.NovoCartao.Bandeira,
                        c.NovoCartao.MesValidade,
                        c.NovoCartao.AnoValidade);
                }
                else if (c.UsuarioCartaoId.HasValue)
                {
                    await _cartaoService.GetByIdAsync(usuarioId, c.UsuarioCartaoId.Value);
                }
                else
                {
                    throw new DomainValidationException("Informe um cartão vinculado ou os dados do novo cartão.");
                }
            }

            // Persistência e associação dos pagamentos
            foreach (var c in cartoes)
            {
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

        private static void ValidarPagamentoZeradoComCupom(
            Pedido pedido,
            ResultadoProcessamentoCupons resultadoCupons,
            List<CheckoutCartaoDTO>? cartoes)
        {
            // 1. Se o valor a pagar é R$ 0,00, valida se há de fato cupons aplicados no pedido
            if (!resultadoCupons.HouveCuponsAplicados || !pedido.CuponsAplicados.Any())
            {
                throw new DomainValidationException(
                    "O valor a pagar da compra é R$ 0,00, mas nenhum cupom válido foi aplicado para cobrir o total do pedido.");
            }

            // 2. Valida se os cupons aplicados cobriram de fato o valor total da compra
            if (resultadoCupons.SaldoDevedor > 0)
            {
                throw new DomainValidationException(
                    $"Os cupons aplicados abateram R$ {resultadoCupons.TotalDescontosAplicados:F2}, restando R$ {resultadoCupons.SaldoDevedor:F2} a ser pago por cartão de crédito.");
            }

            // 3. Valida que nenhum cartão está sendo cobrado
            if (cartoes != null && cartoes.Any(c => c.Valor > 0))
            {
                throw new DomainValidationException(
                    "O valor total da compra foi 100% coberto pelos cupons aplicados. Nenhum valor deve ser cobrado no cartão de crédito.");
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

    /// <summary>
    /// Encapsula o resultado modular do cálculo progressivo dos cupons no checkout.
    /// </summary>
    public class ResultadoProcessamentoCupons
    {
        public decimal SaldoDevedor { get; set; }
        public decimal TotalDescontosAplicados { get; set; }
        public Cupom? CupomTrocaGerado { get; set; }
        public List<Cupom> CuponsAplicados { get; set; } = new();
        public bool HouveCuponsAplicados => CuponsAplicados.Any();
    }
}
