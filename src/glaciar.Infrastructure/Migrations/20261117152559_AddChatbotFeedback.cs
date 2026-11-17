using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatbotFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChatbotFeedbacks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    PerguntaUsuario = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RespostaIa = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    ProdutosRecomendados = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Util = table.Column<bool>(type: "boolean", nullable: true),
                    ComentarioFeedback = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DataInteracao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DataFeedback = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatbotFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatbotFeedbacks_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatbotFeedbacks_UsuarioId",
                table: "ChatbotFeedbacks",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatbotFeedbacks_Util",
                table: "ChatbotFeedbacks",
                column: "Util");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatbotFeedbacks");
        }
    }
}
