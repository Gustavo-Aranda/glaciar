namespace glaciar.Application.DTOs.Vendas
{
    public class CupomResponseDTO
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public decimal ValorDesconto { get; set; }
        public DateTime DataValidade { get; set; }
        public string Categoria { get; set; } = string.Empty;
    }
}
