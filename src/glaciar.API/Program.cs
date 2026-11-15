using Microsoft.EntityFrameworkCore;
using glaciar.Infrastructure.Data;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Domain.Interfaces.Security;
using glaciar.Infrastructure.Repositories;
using glaciar.Application.Services.Clientes;
using glaciar.Application.Services.Enderecos;
using glaciar.Application.Services.Vendas;
using glaciar.Infrastructure.Security;
using glaciar.Application.Interfaces.Services;
using System.Text.Json.Serialization;

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

app.UseAuthorization();
app.MapControllers();

app.Run();
