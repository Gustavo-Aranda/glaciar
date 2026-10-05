using glaciar.Application.DTOs.Enderecos;
using glaciar.Application.DTOs.Vendas;
using glaciar.Domain.Entities.Vendas;

namespace glaciar.Application.Mappings
{
    /// <summary>
    /// Mapeamento manual Entidade -> DTO do módulo de Vendas.
    /// Manual (e não AutoMapper) porque vários campos são calculados (subtotais, abatimentos, disponibilidade).
    /// </summary>
    internal static class VendasMapper
    {
        public static CarrinhoResponseDTO ParaCarrinho(Pedido? carrinho)
        {
            if (carrinho == null) return new CarrinhoResponseDTO();

            var itens = carrinho.ProdutosDoPedido
                .OrderBy(i => i.Id)
                .Select(i =>
                {
                    var estoque = i.Estoque;
                    var produto = estoque?.Produto;
                    var disponivel = produto != null && produto.Visivel && estoque!.Quantidade >= i.Quantidade;

                    return new CarrinhoItemResponseDTO
                    {
                        Id = i.Id,
                        EstoqueId = i.EstoqueId,
                        ProdutoId = produto?.Id ?? 0,
                        NomeProduto = produto?.Nome ?? string.Empty,
                        Tamanho = estoque?.Tamanho ?? string.Empty,
                        Cor = estoque?.Cor ?? string.Empty,
                        Sku = estoque?.SKU ?? string.Empty,
                        PrecoUnitario = i.Preco,
                        Quantidade = i.Quantidade,
                        Subtotal = i.Preco * i.Quantidade,
                        EstoqueDisponivel = estoque?.Quantidade ?? 0,
                        Disponivel = disponivel
                    };
                })
                .ToList();

            return new CarrinhoResponseDTO
            {
                PedidoId = carrinho.Id,
                Itens = itens,
                QuantidadeItens = itens.Sum(i => i.Quantidade),
                Subtotal = itens.Sum(i => i.Subtotal),
                PossuiItensIndisponiveis = itens.Any(i => !i.Disponivel)
            };
        }

        public static PedidoResponseDTO ParaPedido(Pedido pedido, Cupom? cupomTrocaGerado = null)
        {
            var subtotal = pedido.ProdutosDoPedido.Sum(i => i.Preco * i.Quantidade);
            var frete = pedido.Entregas.OrderBy(e => e.Id).FirstOrDefault()?.ValorFrete ?? 0m;
            var somaCupons = pedido.CuponsAplicados.Sum(pc => pc.Cupom?.ValorDesconto ?? 0m);

            return new PedidoResponseDTO
            {
                Id = pedido.Id,
                Codigo = pedido.Codigo,
                Data = pedido.Data,
                Status = pedido.Status,
                Subtotal = subtotal,
                ValorFrete = frete,
                ValorTotal = pedido.ValorTotal,
                ValorAbatidoCupons = Math.Min(somaCupons, pedido.ValorTotal),
                ValorPagoCartoes = pedido.Pagamentos.Sum(p => p.Valor),
                EnderecoEntrega = pedido.Endereco == null ? null : new EnderecoResponseDTO
                {
                    Id = pedido.Endereco.Id,
                    Cep = pedido.Endereco.Cep,
                    Logradouro = pedido.Endereco.Logradouro,
                    Numero = pedido.Endereco.Numero,
                    Complemento = pedido.Endereco.Complemento ?? string.Empty,
                    Bairro = pedido.Endereco.Bairro,
                    Cidade = pedido.Endereco.Cidade,
                    Estado = pedido.Endereco.Estado
                },
                Itens = pedido.ProdutosDoPedido
                    .OrderBy(i => i.Id)
                    .Select(i => new PedidoItemResponseDTO
                    {
                        Id = i.Id,
                        EstoqueId = i.EstoqueId,
                        ProdutoId = i.Estoque?.ProdutoId ?? 0,
                        NomeProduto = i.Estoque?.Produto?.Nome ?? string.Empty,
                        Tamanho = i.Estoque?.Tamanho ?? string.Empty,
                        Cor = i.Estoque?.Cor ?? string.Empty,
                        Sku = i.Estoque?.SKU ?? string.Empty,
                        PrecoUnitario = i.Preco,
                        Quantidade = i.Quantidade,
                        Subtotal = i.Preco * i.Quantidade
                    })
                    .ToList(),
                Pagamentos = pedido.Pagamentos
                    .OrderBy(p => p.Id)
                    .Select(p => new PagamentoResponseDTO
                    {
                        Id = p.Id,
                        Valor = p.Valor,
                        Metodo = p.Metodo,
                        Status = p.Status,
                        UsuarioCartaoId = p.UsuarioCartaoId,
                        CartaoUltimosDigitos = p.UsuarioCartao?.Cartao?.UltimosDigitos,
                        CartaoBandeira = p.UsuarioCartao?.Cartao?.Bandeira.ToString()
                    })
                    .ToList(),
                CuponsAplicados = pedido.CuponsAplicados
                    .Where(pc => pc.Cupom != null)
                    .Select(pc => ParaCupom(pc.Cupom))
                    .ToList(),
                CupomTrocaGerado = cupomTrocaGerado == null ? null : ParaCupom(cupomTrocaGerado)
            };
        }

        public static CupomResponseDTO ParaCupom(Cupom cupom) => new()
        {
            Id = cupom.Id,
            Codigo = cupom.Codigo,
            ValorDesconto = cupom.ValorDesconto,
            DataValidade = cupom.DataValidade,
            Categoria = cupom.CategoriaCupom
        };
    }
}
