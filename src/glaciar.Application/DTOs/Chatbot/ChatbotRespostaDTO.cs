namespace glaciar.Application.DTOs.Chatbot
{
    public class ChatbotRespostaDTO
    {
        public int InteracaoId { get; set; }
        public string Pergunta { get; set; } = string.Empty;
        public string Resposta { get; set; } = string.Empty;
        public List<ProdutoRecomendadoDTO> ProdutosRecomendados { get; set; } = new();
        public bool? Util { get; set; }
        public DateTime DataInteracao { get; set; }
    }

    public class ProdutoRecomendadoDTO
    {
        public int ProdutoId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public decimal Preco { get; set; }
    }
}
