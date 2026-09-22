using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Clientes
{
    public class CartaoUpdateDTO
    {
        public BandeiraCartao Bandeira { get; set; }
        public int MesValidade { get; set; }
        public int AnoValidade { get; set; }
        public bool Padrao { get; set; }
    }
}
