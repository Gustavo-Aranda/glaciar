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

// Módulo de Chatbot de Recomendação com IA Generativa (RNF0044 - Google Gemini)
builder.Services.AddScoped<IChatbotFeedbackRepository, ChatbotFeedbackRepository>();
builder.Services.AddScoped<IChatbotService, ChatbotService>();
builder.Services.AddHttpClient<IGeminiAiService, GeminiAiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(25);
});

// Cada mensagem do chatbot custa uma chamada paga ao Gemini: limita por cliente (X-Usuario-Id) ou IP.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("chatbot", httpContext =>
    {
        var chave = httpContext.Request.Headers["X-Usuario-Id"].FirstOrDefault()
                    ?? httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "anonimo";

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
