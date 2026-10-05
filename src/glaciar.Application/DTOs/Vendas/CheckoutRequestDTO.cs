namespace glaciar.Application.DTOs.Vendas
{
    /// <summary>
    /// Payload único de finalização da compra. O carrinho NÃO vem no payload:
    /// o checkout sempre parte do Pedido "EmAberto" persistido do usuário (DRS: "iniciar a partir do carrinho").
    /// </summary>
    public class CheckoutRequestDTO
    {
        /// <summary>Endereço já cadastrado (UsuarioEndereco.Id). Informe ESTE ou NovoEndereco.</summary>
        public int? UsuarioEnderecoId { get; set; }

        /// <summary>Endereço novo digitado no checkout. Informe ESTE ou UsuarioEnderecoId.</summary>
        public CheckoutEnderecoNovoDTO? NovoEndereco { get; set; }

        /// <summary>No máximo 1 cupom promocional + N cupons de troca do próprio cliente.</summary>
        public List<string> CodigosCupons { get; set; } = new();

        /// <summary>Cartões e o valor que cada um paga. Pode ser vazio se os cupons cobrirem o total.</summary>
        public List<CheckoutCartaoDTO> Cartoes { get; set; } = new();
    }
}
