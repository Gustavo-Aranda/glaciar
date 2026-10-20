using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Fase2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Devolucoes_Pedidos_PedidoId",
                table: "Devolucoes");

            migrationBuilder.AddColumn<DateTime>(
                name: "CarrinhoExpiradoEm",
                table: "Pedidos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReservaExpiraEm",
                table: "Pedidos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QuantidadeReservada",
                table: "Estoques",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "PedidoId",
                table: "Devolucoes",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantidade",
                table: "Devolucoes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Notificacoes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    PedidoId = table.Column<int>(type: "integer", nullable: true),
                    Mensagem = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Lida = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notificacoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notificacoes_Pedidos_PedidoId",
                        column: x => x.PedidoId,
                        principalTable: "Pedidos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Notificacoes_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_PedidoId",
                table: "Notificacoes",
                column: "PedidoId");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacoes_UsuarioId",
                table: "Notificacoes",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Devolucoes_Pedidos_PedidoId",
                table: "Devolucoes",
                column: "PedidoId",
                principalTable: "Pedidos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Devolucoes_Pedidos_PedidoId",
                table: "Devolucoes");

            migrationBuilder.DropTable(
                name: "Notificacoes");

            migrationBuilder.DropColumn(
                name: "CarrinhoExpiradoEm",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "ReservaExpiraEm",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "QuantidadeReservada",
                table: "Estoques");

            migrationBuilder.DropColumn(
                name: "Quantidade",
                table: "Devolucoes");

            migrationBuilder.AlterColumn<int>(
                name: "PedidoId",
                table: "Devolucoes",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_Devolucoes_Pedidos_PedidoId",
                table: "Devolucoes",
                column: "PedidoId",
                principalTable: "Pedidos",
                principalColumn: "Id");
        }
    }
}
