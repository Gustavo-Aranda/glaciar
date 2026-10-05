using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PedidoCupom_UsuarioCupom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedidos_Cupons_CupomId",
                table: "Pedidos");

            migrationBuilder.DropIndex(
                name: "IX_Pedidos_CupomId",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "CupomId",
                table: "Pedidos");

            migrationBuilder.AddColumn<bool>(
                name: "Visivel",
                table: "Produtos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "UsuarioId",
                table: "Cupons",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PedidosCupons",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PedidoId = table.Column<int>(type: "integer", nullable: false),
                    CupomId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PedidosCupons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PedidosCupons_Cupons_CupomId",
                        column: x => x.CupomId,
                        principalTable: "Cupons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PedidosCupons_Pedidos_PedidoId",
                        column: x => x.PedidoId,
                        principalTable: "Pedidos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cupons_UsuarioId",
                table: "Cupons",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosCupons_CupomId",
                table: "PedidosCupons",
                column: "CupomId");

            migrationBuilder.CreateIndex(
                name: "IX_PedidosCupons_PedidoId_CupomId",
                table: "PedidosCupons",
                columns: new[] { "PedidoId", "CupomId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Cupons_Usuarios_UsuarioId",
                table: "Cupons",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cupons_Usuarios_UsuarioId",
                table: "Cupons");

            migrationBuilder.DropTable(
                name: "PedidosCupons");

            migrationBuilder.DropIndex(
                name: "IX_Cupons_UsuarioId",
                table: "Cupons");

            migrationBuilder.DropColumn(
                name: "Visivel",
                table: "Produtos");

            migrationBuilder.DropColumn(
                name: "UsuarioId",
                table: "Cupons");

            migrationBuilder.AddColumn<int>(
                name: "CupomId",
                table: "Pedidos",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_CupomId",
                table: "Pedidos",
                column: "CupomId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pedidos_Cupons_CupomId",
                table: "Pedidos",
                column: "CupomId",
                principalTable: "Cupons",
                principalColumn: "Id");
        }
    }
}
