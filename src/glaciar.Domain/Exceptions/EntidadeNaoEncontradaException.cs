namespace glaciar.Domain.Exceptions
{
    /// <summary>
    /// Recurso inexistente (ou que não pertence ao usuário). Herda de DomainValidationException
    /// para manter compatibilidade com os catch já existentes.
    /// </summary>
    public class EntidadeNaoEncontradaException : DomainValidationException
    {
        public EntidadeNaoEncontradaException(string message) : base(message)
        {
        }
    }
}
