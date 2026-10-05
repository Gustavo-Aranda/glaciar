namespace glaciar.Domain.Entities.Vendas.Enum
{
    /// <summary>
    /// Valores aceitos em Cupom.CategoriaCupom (coluna string).
    /// Centralizado aqui para evitar "magic strings" espalhadas pelas regras de negócio.
    /// </summary>
    public static class CategoriasCupom
    {
        public const string Promocional = "Promocional";
        public const string Troca = "Troca";
    }
}
