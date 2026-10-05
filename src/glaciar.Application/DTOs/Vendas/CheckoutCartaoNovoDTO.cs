using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    public class CheckoutCartaoNovoDTO
    {
        public string Numero { get; set; } = string.Empty;
        public string Cvv { get; set; } = string.Empty;
        public BandeiraCartao Bandeira { get; set; }
        public int MesValidade { get; set; }
        public int AnoValidade { get; set; }

        /// <summary>Se true, o cartão passa a constar no perfil do cliente.</summary>
        public bool SalvarNoPerfil { get; set; }
    }
}
