using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Clientes
{
    public class CartaoResponseDTO
    {
        public int Id { get; set; }
        public int CartaoId { get; set; }
        public string UltimosDigitos { get; set; } = string.Empty;
        public BandeiraCartao Bandeira { get; set; }
        public int MesValidade { get; set; }
        public int AnoValidade { get; set; }
        public bool Padrao { get; set; }
    }
}
