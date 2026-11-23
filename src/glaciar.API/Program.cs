using Microsoft.EntityFrameworkCore;
using glaciar.Infrastructure.Data;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Domain.Interfaces.Security;
using glaciar.Domain.Interfaces.AI;
using glaciar.Infrastructure.Repositories;
using glaciar.Infrastructure.AI;
using glaciar.Application.Services.Clientes;
using glaciar.Application.Services.Enderecos;
using glaciar.Application.Services.Vendas;
using glaciar.Application.Services.Chatbot;
using glaciar.Infrastructure.Security;
using glaciar.Application.Interfaces.Services;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ==========================================
// INJEÇÃO DE DEPENDÊNCIAS
// ==========================================
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IEnderecoService, EnderecoService>();
builder.Services.AddScoped<IEnderecoRepository, EnderecoRepository>();
builder.Services.AddScoped<IUsuarioEnderecoRepository, UsuarioEnderecoRepository>();
builder.Services.AddScoped<ICartaoService, CartaoService>();
builder.Services.AddScoped<ICartaoRepository, CartaoRepository>();
builder.Services.AddScoped<IPagamentoService, PagamentoService>();
builder.Services.AddScoped<INotificacaoRepository, NotificacaoRepository>();
builder.Services.AddScoped<INotificacaoService, NotificacaoService>();

// Módulo de Vendas e Catálogo
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IPedidoRepository, PedidoRepository>();
builder.Services.AddScoped<ICupomRepository, CupomRepository>();
builder.Services.AddScoped<IEstoqueRepository, EstoqueRepository>();
builder.Services.AddScoped<IProdutoRepository, ProdutoRepository>();
builder.Services.AddScoped<IProdutoService, ProdutoService>();
builder.Services.AddScoped<IFreteService, FreteService>();
builder.Services.AddScoped<ICarrinhoService, CarrinhoService>();
builder.Services.AddScoped<ICheckoutService, CheckoutService>();
builder.Services.AddScoped<ICupomService, CupomService>();
builder.Services.AddScoped<IPedidoService, PedidoService>();
builder.Services.AddScoped<IPedidoStatusService, PedidoStatusService>();
builder.Services.AddScoped<ICarrinhoExpiracaoService, CarrinhoExpiracaoService>();
builder.Services.AddScoped<IRelatorioVendasRepository, RelatorioVendasRepository>();
builder.Services.AddScoped<IRelatorioVendasService, RelatorioVendasService>();
builder.Services.AddHostedService<glaciar.API.Workers.CarrinhoExpiracaoWorker>();

// Módulo de Chatbot de Recomendação com IA Generativa Local (RNF0044 - Ollama)
builder.Services.AddScoped<IChatbotFeedbackRepository, ChatbotFeedbackRepository>();
builder.Services.AddScoped<IChatbotService, ChatbotService>();
builder.Services.AddHttpClient<IOllamaAiService, OllamaAiService>(client =>
{
    var baseUrl = builder.Configuration["Ollama:BaseUrl"];
    if (string.IsNullOrWhiteSpace(baseUrl))
        baseUrl = "http://localhost:11434";

    var timeoutSeconds = builder.Configuration.GetValue<int?>("Ollama:TimeoutSeconds") ?? 120;

    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
});

// Proteção da inferência local (Ollama é CPU/GPU-bound: cada resposta pode levar dezenas de segundos).
// São duas camadas complementares, ambas respondendo HTTP 429 quando excedidas:
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // 1) Limite de CONCORRÊNCIA global (somente para POST /api/chatbot/mensagem):
    //    no máximo 2 inferências simultâneas no Ollama e até 4 aguardando na fila (FIFO).
    //    Impede que rajadas de requisições paralelas travem o modelo para todos os clientes.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        httpContext.Request.Path.StartsWithSegments("/api/chatbot/mensagem")
            ? RateLimitPartition.GetConcurrencyLimiter("ollama-inferencia", _ => new ConcurrencyLimiterOptions
            {
                PermitLimit = 2,
                QueueLimit = 4,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            })
            : RateLimitPartition.GetNoLimiter("sem-limite"));

    // 2) Limite de FREQUÊNCIA por IP (política "chatbot"): 10 mensagens/minuto.
    //    A chave é o IP de origem e NÃO o header X-Usuario-Id, pois o header é controlado pelo
    //    cliente: bastaria trocá-lo a cada requisição para nunca ser bloqueado.
    //    Obs.: atrás de proxy/NAT (ex: Docker Desktop), vários clientes podem compartilhar o mesmo IP.
    options.AddPolicy("chatbot", httpContext =>
    {
        var chave = httpContext.Connection.RemoteIpAddress?.ToString() ?? "ip-desconhecido";

        return RateLimitPartition.GetFixedWindowLimiter(chave, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});

// ==========================================
// CONFIGURAÇÃO DE CORS (LIBERAR FRONTEND)
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontend", policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500", "http://localhost:5205")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

app.UseHttpsRedirection();

// Ativa o CORS configurado acima ANTES da autorização
app.UseCors("PermitirFrontend");
app.UseRateLimiter();

app.UseAuthorization();
app.MapControllers();

app.Run();
