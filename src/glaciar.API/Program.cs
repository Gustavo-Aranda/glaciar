using Microsoft.EntityFrameworkCore;
using glaciar.Infrastructure.Data;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Repositories;
using glaciar.Application.Services.Clientes;
using glaciar.Application.Services.Enderecos;
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
builder.Services.AddScoped<UsuarioService>();
builder.Services.AddScoped<EnderecoService>();
builder.Services.AddScoped<IEnderecoRepository, EnderecoRepository>();
builder.Services.AddScoped<IUsuarioEnderecoRepository, UsuarioEnderecoRepository>();
builder.Services.AddScoped<ICartaoService, CartaoService>();
builder.Services.AddScoped<ICartaoRepository, CartaoRepository>();
builder.Services.AddAutoMapper(config =>
    config.AddMaps(typeof(glaciar.Application.Mappings.UsuarioProfile).Assembly));

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
builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseHttpsRedirection();

// Ativa o CORS configurado acima ANTES da autorização
app.UseCors("PermitirFrontend");

app.UseAuthorization();
app.MapControllers();

app.Run();