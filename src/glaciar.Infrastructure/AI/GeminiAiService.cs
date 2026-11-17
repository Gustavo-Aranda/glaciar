using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.AI;

namespace glaciar.Infrastructure.AI
{
    /// <summary>
    /// Cliente HTTP da API Google Gemini. Configuração esperada:
    ///   Gemini:ApiKey (obrigatória, via user-secrets/variável de ambiente) e Gemini:Model (obrigatória).
    /// </summary>
    public class GeminiAiService : IGeminiAiService
    {
        private const string BaseEndpoint = "https://generativelanguage.googleapis.com/v1beta/models";

        private const string RespostaBloqueioSeguranca =
            "Por diretrizes de segurança da Glaciar, não posso processar solicitações com esse conteúdo. Como posso ajudar você a escolher equipamentos para sua próxima trilha ou expedição?";

        private static readonly IReadOnlyList<GeminiSafetySetting> SafetySettings = new List<GeminiSafetySetting>
        {
            new() { Category = "HARM_CATEGORY_HARASSMENT",        Threshold = "BLOCK_LOW_AND_ABOVE" },
            new() { Category = "HARM_CATEGORY_HATE_SPEECH",       Threshold = "BLOCK_LOW_AND_ABOVE" },
            new() { Category = "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold = "BLOCK_LOW_AND_ABOVE" },
            new() { Category = "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold = "BLOCK_LOW_AND_ABOVE" }
        };

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<GeminiAiService> _logger;

        public GeminiAiService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<GeminiAiService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> GerarRecomendacaoAsync(
            string systemPrompt,
            string mensagemUsuario,
            IReadOnlyList<(string Pergunta, string Resposta)>? historicoRecente = null,
            CancellationToken cancellationToken = default)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var model = _configuration["Gemini:Model"];

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("SUA_CHAVE", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogError("Gemini:ApiKey não configurada.");
                throw new ServicoIaIndisponivelException("A assistente virtual está temporariamente indisponível.");
            }

            if (string.IsNullOrWhiteSpace(model))
            {
                _logger.LogError("Gemini:Model não configurado.");
                throw new ServicoIaIndisponivelException("A assistente virtual está temporariamente indisponível.");
            }

            var contents = new List<GeminiContent>();

            if (historicoRecente != null)
            {
                foreach (var turno in historicoRecente.TakeLast(4))
                {
                    contents.Add(NovoConteudo("user", EnvolverMensagemCliente(turno.Pergunta)));
                    contents.Add(NovoConteudo("model", turno.Resposta));
                }
            }

            contents.Add(NovoConteudo("user", EnvolverMensagemCliente(mensagemUsuario)));

            var payload = new GeminiGenerateContentRequest
            {
                SystemInstruction = new GeminiContent { Parts = new List<GeminiPart> { new() { Text = systemPrompt } } },
                Contents = contents,
                SafetySettings = SafetySettings.ToList(),
                GenerationConfig = new GeminiGenerationConfig()
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseEndpoint}/{model}:generateContent")
            {
                Content = JsonContent.Create(payload)
            };
            // A chave vai no header (e não na query string) para não aparecer nos logs de URL do HttpClient.
            request.Headers.Add("x-goog-api-key", apiKey);

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.SendAsync(request, cancellationToken);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !cancellationToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Falha de comunicação com a API do Gemini.");
                throw new ServicoIaIndisponivelException("A assistente virtual está temporariamente indisponível.");
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var corpo = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("API do Gemini retornou {StatusCode}: {Corpo}", (int)response.StatusCode, corpo);
                    throw new ServicoIaIndisponivelException("A assistente virtual está temporariamente indisponível.");
                }

                var result = await response.Content.ReadFromJsonAsync<GeminiGenerateContentResponse>(cancellationToken: cancellationToken);
                var candidato = result?.Candidates?.FirstOrDefault();

                if (!string.IsNullOrWhiteSpace(result?.PromptFeedback?.BlockReason) ||
                    string.Equals(candidato?.FinishReason, "SAFETY", StringComparison.OrdinalIgnoreCase))
                {
                    return RespostaBloqueioSeguranca;
                }

                var texto = candidato?.Content?.Parts?.FirstOrDefault()?.Text;
                return string.IsNullOrWhiteSpace(texto)
                    ? "Não consegui formular uma recomendação agora. Pode reformular sua dúvida sobre nossos equipamentos?"
                    : texto.Trim();
            }
        }

        /// <summary>
        /// Trata a mensagem como dado puro: neutraliza '<' e '>' para que o usuário não consiga
        /// fechar a tag e injetar instruções fora do envelope.
        /// </summary>
        private static string EnvolverMensagemCliente(string mensagem)
        {
            var segura = (mensagem ?? string.Empty).Replace("<", "&lt;").Replace(">", "&gt;");
            return $"<mensagem_cliente>{segura}</mensagem_cliente>";
        }

        private static GeminiContent NovoConteudo(string role, string texto) => new()
        {
            Role = role,
            Parts = new List<GeminiPart> { new() { Text = texto } }
        };

        private sealed class GeminiGenerateContentRequest
        {
            [JsonPropertyName("system_instruction")]
            public GeminiContent? SystemInstruction { get; set; }

            [JsonPropertyName("contents")]
            public List<GeminiContent> Contents { get; set; } = new();

            [JsonPropertyName("safetySettings")]
            public List<GeminiSafetySetting>? SafetySettings { get; set; }

            [JsonPropertyName("generationConfig")]
            public GeminiGenerationConfig? GenerationConfig { get; set; }
        }

        private sealed class GeminiSafetySetting
        {
            [JsonPropertyName("category")]
            public string Category { get; set; } = string.Empty;

            [JsonPropertyName("threshold")]
            public string Threshold { get; set; } = string.Empty;
        }

        private sealed class GeminiContent
        {
            [JsonPropertyName("role")]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
            public string? Role { get; set; }

            [JsonPropertyName("parts")]
            public List<GeminiPart> Parts { get; set; } = new();
        }

        private sealed class GeminiPart
        {
            [JsonPropertyName("text")]
            public string Text { get; set; } = string.Empty;
        }

        private sealed class GeminiGenerationConfig
        {
            [JsonPropertyName("temperature")]
            public double Temperature { get; set; } = 0.3;

            [JsonPropertyName("topP")]
            public double TopP { get; set; } = 0.85;

            [JsonPropertyName("maxOutputTokens")]
            public int MaxOutputTokens { get; set; } = 600;
        }

        private sealed class GeminiGenerateContentResponse
        {
            [JsonPropertyName("candidates")]
            public List<GeminiCandidate>? Candidates { get; set; }

            [JsonPropertyName("promptFeedback")]
            public GeminiPromptFeedback? PromptFeedback { get; set; }
        }

        private sealed class GeminiCandidate
        {
            [JsonPropertyName("content")]
            public GeminiContent? Content { get; set; }

            [JsonPropertyName("finishReason")]
            public string? FinishReason { get; set; }
        }

        private sealed class GeminiPromptFeedback
        {
            [JsonPropertyName("blockReason")]
            public string? BlockReason { get; set; }
        }
    }
}
