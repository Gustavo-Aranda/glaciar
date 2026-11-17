using System.ComponentModel.DataAnnotations;
using glaciar.Domain.Exceptions;

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
        [MaxLength(10, ErrorMessage = "Quantidade máxima de cupons excedida na requisição.")]
        public List<string> CodigosCupons { get; set; } = new();

        /// <summary>Cartões e o valor que cada um paga. Pode ser vazio se os cupons cobrirem o total.</summary>
        [MaxLength(5, ErrorMessage = "Não é permitido ratear o pagamento em mais de 5 cartões.")]
        public List<CheckoutCartaoDTO> Cartoes { get; set; } = new();

        /// <summary>
        /// Validação estrutural (fail-fast) antes de abrir transação: o endereço deve vir de UMA única fonte
        /// (cadastrado OU novo), nunca das duas nem de nenhuma.
        /// </summary>
        public void ValidarGuardrailsDeEntrada()
        {
            if (UsuarioEnderecoId.HasValue && UsuarioEnderecoId.Value <= 0)
                throw new DomainValidationException("O identificador do endereço selecionado é inválido.");

            if (UsuarioEnderecoId.HasValue && NovoEndereco != null)
                throw new DomainValidationException("Informe um endereço cadastrado OU um novo endereço, não ambos.");

            if (!UsuarioEnderecoId.HasValue && NovoEndereco == null)
                throw new DomainValidationException("Endereço de entrega não informado.");
        }
    }
}
