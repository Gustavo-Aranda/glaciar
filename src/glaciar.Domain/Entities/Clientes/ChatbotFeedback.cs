using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using glaciar.Domain.Exceptions;

namespace glaciar.Domain.Entities.Clientes
{
    /// <summary>
    /// Registra uma interação do cliente com a assistente virtual Glaucia (RNF0044)
    /// e a avaliação (Útil / Não Útil) dada à resposta.
    /// </summary>
    public class ChatbotFeedback
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [ForeignKey(nameof(UsuarioId))]
        public Usuario Usuario { get; set; } = null!;

        [Required]
        [MaxLength(1000)]
        public string PerguntaUsuario { get; set; } = null!;

        [Required]
        [MaxLength(4000)]
        public string RespostaIa { get; set; } = null!;

        /// <summary>Nomes dos produtos citados na resposta, separados por "|".</summary>
        [MaxLength(500)]
        public string? ProdutosRecomendados { get; set; }

        /// <summary>null = não avaliada | true = Útil | false = Não Útil.</summary>
        public bool? Util { get; private set; }

        [MaxLength(500)]
        public string? ComentarioFeedback { get; private set; }

        [Required]
        public DateTime DataInteracao { get; set; } = DateTime.UtcNow;

        public DateTime? DataFeedback { get; private set; }

        public static ChatbotFeedback CriarInteracao(
            int usuarioId,
            string perguntaUsuario,
            string respostaIa,
            IEnumerable<string>? produtosRecomendados)
        {
            if (usuarioId <= 0)
                throw new DomainValidationException("Usuário inválido para registro de interação no chatbot.");

            if (string.IsNullOrWhiteSpace(perguntaUsuario))
                throw new DomainValidationException("A pergunta do usuário não pode ser vazia.");

            if (string.IsNullOrWhiteSpace(respostaIa))
                throw new DomainValidationException("A resposta da IA não pode ser vazia.");

            var produtos = produtosRecomendados?.Where(p => !string.IsNullOrWhiteSpace(p)).ToList();
            var produtosConcatenados = produtos is { Count: > 0 } ? string.Join('|', produtos) : null;

            return new ChatbotFeedback
            {
                UsuarioId = usuarioId,
                PerguntaUsuario = Truncar(perguntaUsuario.Trim(), MaxPergunta),
                RespostaIa = Truncar(respostaIa.Trim(), MaxResposta),
                ProdutosRecomendados = produtosConcatenados is null ? null : Truncar(produtosConcatenados, MaxProdutos),
                DataInteracao = DateTime.UtcNow
            };
        }

        private const int MaxPergunta = 1000;
        private const int MaxResposta = 4000;
        private const int MaxProdutos = 500;

        /// <summary>
        /// Garante que o texto gerado pela IA nunca ultrapasse o tamanho das colunas, evitando
        /// falha no SaveChanges (HTTP 500) e a perda da resposta já gerada.
        /// </summary>
        private static string Truncar(string valor, int max) =>
            valor.Length <= max ? valor : valor[..(max - 3)].TrimEnd() + "...";

        public IReadOnlyList<string> ListarProdutosRecomendados() =>
            string.IsNullOrWhiteSpace(ProdutosRecomendados)
                ? Array.Empty<string>()
                : ProdutosRecomendados.Split('|', StringSplitOptions.RemoveEmptyEntries);

        public void RegistrarAvaliacao(bool util, string? comentario = null)
        {
            if (Util.HasValue)
                throw new DomainValidationException("Esta resposta já foi avaliada.");

            Util = util;
            ComentarioFeedback = string.IsNullOrWhiteSpace(comentario) ? null : comentario.Trim();
            DataFeedback = DateTime.UtcNow;
        }
    }
}
