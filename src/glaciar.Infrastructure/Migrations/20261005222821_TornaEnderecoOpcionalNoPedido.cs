using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TornaEnderecoOpcionalNoPedido : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedidos_Enderecos_EnderecoId",
                table: "Pedidos");

            migrationBuilder.AlterColumn<int>(
                name: "EnderecoId",
                table: "Pedidos",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_Pedidos_Enderecos_EnderecoId",
                table: "Pedidos",
                column: "EnderecoId",
                principalTable: "Enderecos",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pedidos_Enderecos_EnderecoId",
                table: "Pedidos");

            migrationBuilder.AlterColumn<int>(
                name: "EnderecoId",
                table: "Pedidos",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Pedidos_Enderecos_EnderecoId",
                table: "Pedidos",
                column: "EnderecoId",
                principalTable: "Enderecos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
