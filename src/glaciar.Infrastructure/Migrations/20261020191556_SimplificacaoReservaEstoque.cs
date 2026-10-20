using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SimplificacaoReservaEstoque : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuantidadeReservada",
                table: "Estoques");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "QuantidadeReservada",
                table: "Estoques",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
