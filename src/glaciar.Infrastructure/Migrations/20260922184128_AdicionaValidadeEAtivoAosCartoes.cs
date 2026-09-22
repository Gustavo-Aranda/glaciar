using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AdicionaValidadeEAtivoAosCartoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsuariosCartoes_UsuarioId",
                table: "UsuariosCartoes");

            migrationBuilder.AddColumn<bool>(
                name: "Ativo",
                table: "UsuariosCartoes",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "AnoValidade",
                table: "Cartoes",
                type: "integer",
                nullable: false,
                defaultValue: 2099);

            migrationBuilder.AddColumn<int>(
                name: "MesValidade",
                table: "Cartoes",
                type: "integer",
                nullable: false,
                defaultValue: 12);

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosCartoes_UsuarioId_CartaoId",
                table: "UsuariosCartoes",
                columns: new[] { "UsuarioId", "CartaoId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsuariosCartoes_UsuarioId_CartaoId",
                table: "UsuariosCartoes");

            migrationBuilder.DropColumn(
                name: "Ativo",
                table: "UsuariosCartoes");

            migrationBuilder.DropColumn(
                name: "AnoValidade",
                table: "Cartoes");

            migrationBuilder.DropColumn(
                name: "MesValidade",
                table: "Cartoes");

            migrationBuilder.CreateIndex(
                name: "IX_UsuariosCartoes_UsuarioId",
                table: "UsuariosCartoes",
                column: "UsuarioId");
        }
    }
}
