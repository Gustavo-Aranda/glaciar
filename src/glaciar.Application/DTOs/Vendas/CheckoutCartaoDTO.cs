namespace glaciar.Application.DTOs.Vendas
{
    public class CheckoutCartaoDTO
    {
        /// <summary>Cartão já cadastrado (UsuarioCartao.Id). Informe ESTE ou NovoCartao.</summary>
        public int? UsuarioCartaoId { get; set; }

        /// <summary>Cartão novo digitado no checkout. Informe ESTE ou UsuarioCartaoId.</summary>
        public CheckoutCartaoNovoDTO? NovoCartao { get; set; }

        /// <summary>Valor (R$) a ser cobrado neste cartão.</summary>
        public decimal Valor { get; set; }
    }
}
