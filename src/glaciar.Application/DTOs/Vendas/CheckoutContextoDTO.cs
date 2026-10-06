using glaciar.Application.DTOs.Clientes;
using glaciar.Application.DTOs.Enderecos;

namespace glaciar.Application.DTOs.Vendas
{
    public class CheckoutContextoDTO
    {
        public CarrinhoResponseDTO Carrinho { get; set; } = new();
        public UsuarioEnderecoResponseDTO? EnderecoPrincipal { get; set; }
        public decimal ValorFrete { get; set; }
        public decimal ValorTotal { get; set; }
        public IEnumerable<CartaoResponseDTO> Cartoes { get; set; } = new List<CartaoResponseDTO>();
    }
}
