namespace glaciar.Domain.Interfaces.Repositories
{
    /// <summary>
    /// Controle de transação para casos de uso que tocam vários agregados
    /// (ex.: checkout = baixa de estoque + pagamentos + cupons + endereço).
    /// Como todos os repositórios compartilham o mesmo DbContext (Scoped),
    /// cada SaveChanges interno passa a fazer parte da mesma transação.
    /// </summary>
    public interface IUnitOfWork
    {
        Task BeginTransactionAsync();
        Task CommitAsync();
        Task RollbackAsync();
    }
}
