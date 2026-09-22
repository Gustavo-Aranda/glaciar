using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Clientes
{
    public class CartaoCreateDTO
    {
        public int UsuarioId { get; set; }
        public string Numero { get; set; } = string.Empty;
        public string Cvv { get; set; } = string.Empty;
        public BandeiraCartao Bandeira { get; set; }
        public int MesValidade { get; set; }
        public int AnoValidade { get; set; }
        public bool Padrao { get; set; }
    }
}
