using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Catalogos;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Logisticas;
using glaciar.Domain.Entities.Vendas;

namespace glaciar.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }
        
        // Catálogo
        public DbSet<Produto> Produtos { get; set; }
        public DbSet<Estoque> Estoques { get; set; }
        public DbSet<Categoria> Categorias { get; set; }
        public DbSet<CategoriaProduto> CategoriasProdutos { get; set; }
        
        // Clientes
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Endereco> Enderecos { get; set; }
        public DbSet<UsuarioEndereco> UsuariosEnderecos { get; set; }
        public DbSet<Cartao> Cartoes { get; set; }
        public DbSet<UsuarioCartao> UsuariosCartoes { get; set; }
        
        // Logística
        public DbSet<Devolucao> Devolucoes { get; set; }
        public DbSet<Entrega> Entregas { get; set; }

        // Vendas
        public DbSet<Pedido> Pedidos { get; set; }
        public DbSet<PedidoProduto> PedidosProdutos { get; set; }
        public DbSet<Cupom> Cupons { get; set; }
        public DbSet<Pagamento> Pagamentos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Enum do Catálogo - Tipo de Produto
            modelBuilder.Entity<Produto>()
                .Property(p => p.Tipo)
                .HasConversion<string>(); 

            // Enum do Cliente - Bandeira do Cartão
            modelBuilder.Entity<Cartao>()
                .Property(c => c.Bandeira)
                .HasConversion<string>();

            // Enum do Cliente - Estado
            modelBuilder.Entity<Endereco>()
                .Property(e => e.Estado)
                .HasConversion<string>();
            
            // Enum de Vendas - Status
            modelBuilder.Entity<Pedido>()
                .Property(p => p.Status)
                .HasConversion<string>();

            // Enum de Pagamento - Status
            modelBuilder.Entity<Pagamento>()
                .Property(p => p.Status)
                .HasConversion<string>();

            // Enum de Pagamento - Método
            modelBuilder.Entity<Pagamento>()
                .Property(p => p.Metodo)
                .HasConversion<string>();

            // Enum de Entrega - Status
            modelBuilder.Entity<Entrega>()
                .Property(e => e.Status)
                .HasConversion<string>();

            // Enum de Devolucao - Status 
            modelBuilder.Entity<Devolucao>()
                .Property(p => p.Status)
                .HasConversion<string>();
                
            // Enum do Cliente - Tipo
            modelBuilder.Entity<Usuario>()
                .Property(u => u.TipoUsuario)
                .HasConversion<string>();

            modelBuilder.Entity<Cartao>()
                .HasMany(c => c.UsuariosVinculados)
                .WithOne(uc => uc.Cartao)
                .HasForeignKey(uc => uc.CartaoId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Usuario>()
                .HasMany(u => u.CartoesVinculados)
                .WithOne(uc => uc.Usuario)
                .HasForeignKey(uc => uc.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UsuarioCartao>()
                .HasIndex(uc => new { uc.UsuarioId, uc.CartaoId })
                .IsUnique();

        }
    }
}