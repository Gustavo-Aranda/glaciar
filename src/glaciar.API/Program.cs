using Microsoft.EntityFrameworkCore;
using glaciar.Infrastructure.Data;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Repositories;
using glaciar.Application.Services.Clientes;
using glaciar.Infrastructure.Security;
using glaciar.Application.Interfaces.Services;

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
builder.Services.AddScoped<IEnderecoRepository, EnderecoRepository>();
builder.Services.AddScoped<IUsuarioEnderecoRepository, UsuarioEnderecoRepository>();

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

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseHttpsRedirection();

// Ativa o CORS configurado acima ANTES da autorização
app.UseCors("PermitirFrontend");

app.UseAuthorization();
app.MapControllers();

app.Run();