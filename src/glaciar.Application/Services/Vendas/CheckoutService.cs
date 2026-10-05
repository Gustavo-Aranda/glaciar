using glaciar.Application.DTOs.Enderecos;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Application.Mappings;
using glaciar.Domain.Entities.Clientes.Enum;
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
        private readonly IPedidoRepository _pedidoRepository;
        private readonly ICupomRepository _cupomRepository;
        private readonly IEstoqueRepository _estoqueRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEnderecoService _enderecoService;
        private readonly ICartaoService _cartaoService;
        private readonly IFreteService _freteService;

        public CheckoutService(
            IPedidoRepository pedidoRepository,
            ICupomRepository cupomRepository,
            IEstoqueRepository estoqueRepository,
            IUnitOfWork unitOfWork,
            IEnderecoService enderecoService,
            ICartaoService cartaoService,
            IFreteService freteService)
        {
            _pedidoRepository = pedidoRepository;
            _cupomRepository = cupomRepository;
            _estoqueRepository = estoqueRepository;
            _unitOfWork = unitOfWork;
            _enderecoService = enderecoService;
            _cartaoService = cartaoService;
            _freteService = freteService;
        }

        public async Task<PedidoResponseDTO> FinalizarCompraAsync(int usuarioId, CheckoutRequestDTO dto) // refatorar com outras funcoes privadas
        {
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var pedido = await _pedidoRepository.GetCarrinhoAsync(usuarioId);
                if (pedido == null || !pedido.ProdutosDoPedido.Any())
                {
                    throw new DomainValidationException("Carrinho vazio ou não encontrado.");
                }

                // 1. Processar Endereço
                EnderecoResponseDTO enderecoFisico = null!;
                if (dto.UsuarioEnderecoId.HasValue)
                {
                    enderecoFisico = await _enderecoService.ObterEnderecoDoClienteAsync(usuarioId, dto.UsuarioEnderecoId.Value);
                }
                else if (dto.NovoEndereco != null)
                {
                    enderecoFisico = await _enderecoService.RegistrarEnderecoDeEntregaAsync(new EnderecoCreateDTO
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
                else
                {
                    throw new DomainValidationException("Endereço de entrega não informado.");
                }

                pedido.EnderecoId = enderecoFisico.Id;
                
                // 2. Calcular Frete
                var totalItens = pedido.ProdutosDoPedido.Sum(p => p.Quantidade); //analisar
                var valorFrete = _freteService.Calcular(enderecoFisico.Estado, totalItens);
                
                pedido.Entregas.Add(new Entrega
                {
                    ValorFrete = valorFrete,
                    CodigoRastreamento = "AGUARDANDO", // Mockado temporariamente
                    Status = StatusEntrega.EmProcessamento,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                var subtotalProdutos = pedido.ProdutosDoPedido.Sum(p => p.Preco * p.Quantidade);

                // 3. Validar e Aplicar Cupons
                decimal totalDescontos = 0;
                int countPromocionais = 0;

                // Limpa quaisquer cupons que talvez já estivessem vinculados indevidamente no carrinho aberto
                pedido.CuponsAplicados.Clear();

                foreach (var codigo in dto.CodigosCupons)
                {
                    var cupom = await _cupomRepository.GetByCodigoAsync(codigo);
                    CupomRegras.ValidarUso(cupom, usuarioId, codigo);

                    if (CupomRegras.EhPromocional(cupom!))
                    {
                        countPromocionais++;
                        if (countPromocionais > 1) throw new DomainValidationException("Apenas um cupom promocional pode ser usado por pedido.");
                    }

                    pedido.CuponsAplicados.Add(new PedidoCupom
                    {
                        CupomId = cupom!.Id,
                        PedidoId = pedido.Id,
                        Pedido = pedido
                    });

                    // Registra que o cupom foi "usado"
                    cupom.QuantidadeMaximaUso--;

                    totalDescontos += cupom.ValorDesconto;
                }

                // 4. Calcular Total a Pagar
                var totalAposCupons = (subtotalProdutos + valorFrete) - totalDescontos;
                Cupom? cupomTrocaGerado = null;
                
                if (totalAposCupons < 0)
                {
                    // O cliente tem mais saldo de troca do que o valor da compra. Gera novo cupom de troca com o troco.
                    var troco = Math.Abs(totalAposCupons);
                    cupomTrocaGerado = new Cupom
                    {
                        Codigo = $"TROCA-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
                        ValorDesconto = troco,
                        DataValidade = DateTime.UtcNow.AddYears(1), // Assuming DateTime based on rules
                        CategoriaCupom = "Troca",
                        Ativo = true,
                        QuantidadeMaximaUso = 1,
                        UsuarioId = usuarioId
                    };
                    await _cupomRepository.AddAsync(cupomTrocaGerado);
                    totalAposCupons = 0;
                }

                pedido.ValorTotal = subtotalProdutos + valorFrete;

                // 5. Processar Pagamentos (Cartão de Crédito)
                if (totalAposCupons > 0)
                {
                    decimal totalCartoes = 0;
                    if (!dto.Cartoes.Any()) throw new DomainValidationException("Nenhum cartão informado para o saldo devedor.");
                    
                    foreach (var c in dto.Cartoes)
                    {
                        if (c.Valor < 10m) throw new DomainValidationException("O valor mínimo em cada cartão de crédito é R$ 10,00.");
                        
                        int? usuarioCartaoId = c.UsuarioCartaoId;
                        if (c.NovoCartao != null)
                        {
                            if (c.NovoCartao.SalvarNoPerfil) //cuidado com a segurança, por causa do dto (revisar)
                            {
                                var novoUsuarioCartao = await _cartaoService.CreateAsync(new Application.DTOs.Clientes.CartaoCreateDTO
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
                        }

                        pedido.Pagamentos.Add(new Pagamento
                        {
                            Valor = c.Valor,
                            Status = StatusPagamento.PagamentoRealizado, // Simulando aprovação síncrona
                            Metodo = MetodoPagamento.Credito,
                            Data = DateOnly.FromDateTime(DateTime.UtcNow),
                            QuantidadeParcelas = 1, // Poderia vir do DTO
                            UsuarioCartaoId = usuarioCartaoId,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                        totalCartoes += c.Valor;
                    }

                    if (totalCartoes < totalAposCupons)
                        throw new DomainValidationException($"O valor dos cartões (R$ {totalCartoes}) é inferior ao saldo devedor (R$ {totalAposCupons}).");
                }

                // 6. Baixa de Estoque e Fechamento do Pedido
                foreach (var item in pedido.ProdutosDoPedido)
                {
                    var baixou = await _estoqueRepository.BaixarEstoqueAsync(item.EstoqueId, item.Quantidade);
                    if (!baixou) throw new DomainValidationException($"Estoque insuficiente para o item {item.Estoque?.Produto?.Nome} (Tamanho: {item.Estoque?.Tamanho}, Cor: {item.Estoque?.Cor}).");
                }

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
    }
}
