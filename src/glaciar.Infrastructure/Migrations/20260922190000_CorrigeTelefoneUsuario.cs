using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace glaciar.Infrastructure.Migrations
{
    public partial class CorrigeTelefoneUsuario : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Usuarios"
                ADD COLUMN IF NOT EXISTS "Telefone" character varying(11);

                UPDATE "Usuarios"
                SET "Telefone" = ''
                WHERE "Telefone" IS NULL;

                ALTER TABLE "Usuarios"
                ALTER COLUMN "Telefone" SET NOT NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Usuarios"
                DROP COLUMN IF EXISTS "Telefone";
                """);
        }
    }
}