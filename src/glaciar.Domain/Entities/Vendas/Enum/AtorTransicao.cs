namespace glaciar.Domain.Entities.Vendas.Enum
{
    /// <summary>
    /// Quem está disparando uma mudança de status do Pedido.
    /// [Flags] permite que uma mesma transição seja autorizada para mais de um ator
    /// (ex.: EmTransporte → Entregue pode ser confirmado pelo Cliente ou pelo Administrador).
    /// </summary>
    [Flags]
    public enum AtorTransicao
    {
        Nenhum = 0,

        /// <summary>Fluxos internos (ex.: checkout). Nunca pode ser disparado via endpoint HTTP.</summary>
        Sistema = 1,

        Cliente = 2,

        Administrador = 4
    }
}
