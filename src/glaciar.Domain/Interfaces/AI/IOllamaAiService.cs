namespace glaciar.Domain.Interfaces.AI
{
    public interface IOllamaAiService
    {
        Task<string> GerarRecomendacaoAsync(
            string systemPrompt,
            string mensagemUsuario,
            IReadOnlyList<(string Pergunta, string Resposta)>? historicoRecente = null,
            CancellationToken cancellationToken = default);
    }
}
