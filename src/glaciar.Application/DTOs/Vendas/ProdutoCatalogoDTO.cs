namespace glaciar.Application.DTOs.Vendas
{
    public class ProdutoCatalogoDTO
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public decimal Preco { get; set; }
        public List<ProdutoCatalogoEstoqueDTO> Estoques { get; set; } = new();
    }

    public class ProdutoCatalogoEstoqueDTO
    {
        public int EstoqueId { get; set; }
        public string Tamanho { get; set; } = string.Empty;
        public string Cor { get; set; } = string.Empty;
        public int Quantidade { get; set; }
    }
}
