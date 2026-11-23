using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.AI;

namespace glaciar.Infrastructure.AI
{
    /// <summary>
    /// Cliente HTTP para inferência local via Ollama (/api/chat).
    /// Configurações esperadas em appsettings / variáveis de ambiente:
    ///   Ollama:BaseUrl (ex: http://ollama:11434 ou http://localhost:11434)
    ///   Ollama:Model (ex: glaciar-assistant)
    ///   Ollama:Temperature (padrão: 0.1)
    ///   Ollama:MaxTokens (padrão: 85)
    ///   Ollama:KeepAlive (padrão: 15m)
    /// </summary>
    public class OllamaAiService : IOllamaAiService
    {
        private const string DefaultModel = "glaciar-assistant";
        private const double DefaultTemperature = 0.1;
        private const int DefaultMaxTokens = 160;
        private const int DefaultNumCtx = 1024;
        private const int DefaultNumThread = 6;
        private const string DefaultKeepAlive = "15m";

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OllamaAiService> _logger;

        public OllamaAiService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<OllamaAiService> logger)
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
            var model = _configuration["Ollama:Model"];
            if (string.IsNullOrWhiteSpace(model))
                model = DefaultModel;

            var keepAlive = _configuration["Ollama:KeepAlive"];
            if (string.IsNullOrWhiteSpace(keepAlive))
                keepAlive = DefaultKeepAlive;

            var temperature = DefaultTemperature;
            if (double.TryParse(
                    _configuration["Ollama:Temperature"],
                    System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var parsedTemp))
            {
                temperature = parsedTemp;
            }

            var messages = new List<OllamaChatMessage>
            {
                new()
                {
                    Role = "system",
                    Content = systemPrompt
                }
            };

            if (historicoRecente != null)
            {
                // Limita ao último turno para economizar Prompt Eval em CPU
                foreach (var turno in historicoRecente.TakeLast(1))
                {
                    messages.Add(new OllamaChatMessage
                    {
                        Role = "user",
                        Content = EnvolverMensagemCliente(turno.Pergunta)
                    });
                    messages.Add(new OllamaChatMessage
                    {
                        Role = "assistant",
                        Content = turno.Resposta
                    });
                }
            }

            messages.Add(new OllamaChatMessage
            {
                Role = "user",
                Content = EnvolverMensagemCliente(mensagemUsuario)
            });

            var payload = new OllamaChatRequest
            {
                Model = model,
                Stream = false,
                KeepAlive = keepAlive,
                Messages = messages,
                Options = new OllamaModelOptions
                {
                    Temperature = temperature,
                    TopP = 0.85,
                    RepeatPenalty = 1.15,
                    NumCtx = DefaultNumCtx,
                    NumPredict = int.TryParse(_configuration["Ollama:MaxTokens"], out var maxTokens) && maxTokens > 0
                        ? maxTokens
                        : DefaultMaxTokens,
                    NumThread = DefaultNumThread,
                    Stop = new List<string>
                    {
                        "<|im_start|>",
                        "<|im_end|>",
                        "<|eot_id|>",
                        "Além disso",
                        "Outros fatores",
                        "Dicas adicionais",
                        "Fatores a considerar",
                        "Vale lembrar"
                    }
                }
            };

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.PostAsJsonAsync("/api/chat", payload, cancellationToken);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !cancellationToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Falha de comunicação ou timeout ao consultar o servidor local do Ollama.");
                throw new ServicoIaIndisponivelException("A assistente virtual local está temporariamente indisponível. Verifique se o serviço Ollama está em execução.");
            }

            using (response)
            {
                if (!response.IsSuccessStatusCode)
                {
                    var corpo = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("Ollama retornou HTTP {StatusCode}: {Corpo}", (int)response.StatusCode, corpo);
                    throw new ServicoIaIndisponivelException("A assistente virtual está temporariamente indisponível.");
                }

                var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(cancellationToken: cancellationToken);
                var texto = result?.Message?.Content;

                return string.IsNullOrWhiteSpace(texto)
                    ? "Não consegui formular uma recomendação agora. Pode reformular sua dúvida sobre nossos equipamentos?"
                    : texto.Trim();
            }
        }

        /// <summary>
        /// Isola a entrada do usuário como dado puro dentro de delimitadores XML,
        /// neutralizando '<' e '>' para evitar escape de tag e prompt injection.
        /// </summary>
        private static string EnvolverMensagemCliente(string mensagem)
        {
            var segura = (mensagem ?? string.Empty).Replace("<", "&lt;").Replace(">", "&gt;");
            return $"<mensagem_cliente>{segura}</mensagem_cliente>";
        }

        private sealed class OllamaChatRequest
        {
            [JsonPropertyName("model")]
            public string Model { get; set; } = DefaultModel;

            [JsonPropertyName("messages")]
            public List<OllamaChatMessage> Messages { get; set; } = new();

            [JsonPropertyName("stream")]
            public bool Stream { get; set; }

            [JsonPropertyName("keep_alive")]
            public string KeepAlive { get; set; } = DefaultKeepAlive;

            [JsonPropertyName("options")]
            public OllamaModelOptions Options { get; set; } = new();
        }

        private sealed class OllamaChatMessage
        {
            [JsonPropertyName("role")]
            public string Role { get; set; } = string.Empty;

            [JsonPropertyName("content")]
            public string Content { get; set; } = string.Empty;
        }

        private sealed class OllamaModelOptions
        {
            [JsonPropertyName("temperature")]
            public double Temperature { get; set; } = DefaultTemperature;

            [JsonPropertyName("top_p")]
            public double TopP { get; set; } = 0.85;

            [JsonPropertyName("repeat_penalty")]
            public double RepeatPenalty { get; set; } = 1.15;

            [JsonPropertyName("num_ctx")]
            public int NumCtx { get; set; } = DefaultNumCtx;

            /// <summary>Limite de tokens gerados: evita respostas prolixas e timeout de CPU.</summary>
            [JsonPropertyName("num_predict")]
            public int NumPredict { get; set; } = DefaultMaxTokens;

            /// <summary>Limita a 6 threads físicas para evitar contenção de cache L3 e SMT em CPUs de 6 núcleos.</summary>
            [JsonPropertyName("num_thread")]
            public int NumThread { get; set; } = DefaultNumThread;

            /// <summary>Gatilhos de parada que cortam a geração imediatamente ao detectar fim de turno ou seções desnecessárias.</summary>
            [JsonPropertyName("stop")]
            public List<string>? Stop { get; set; }
        }

        private sealed class OllamaChatResponse
        {
            [JsonPropertyName("model")]
            public string? Model { get; set; }

            [JsonPropertyName("message")]
            public OllamaChatMessage? Message { get; set; }

            [JsonPropertyName("done")]
            public bool Done { get; set; }
        }
    }
}
