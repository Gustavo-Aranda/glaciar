namespace glaciar.Domain.Exceptions
{
    /// <summary>
    /// O registro foi alterado por outra operação entre a leitura e a gravação
    /// (ex.: dois administradores aplicando status diferentes no mesmo pedido ao mesmo tempo).
    /// Controllers devem mapear para HTTP 409 Conflict.
    /// </summary>
    public class ConflitoDeConcorrenciaException : DomainValidationException
    {
        public ConflitoDeConcorrenciaException(string message) : base(message)
        {
        }
    }
}
