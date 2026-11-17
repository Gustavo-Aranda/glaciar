namespace glaciar.Domain.Exceptions
{
    /// <summary>
    /// A IA generativa está indisponível ou mal configurada (falha de infraestrutura, não erro do cliente).
    /// Tratada na API como HTTP 503.
    /// </summary>
    public class ServicoIaIndisponivelException : Exception
    {
        public ServicoIaIndisponivelException(string message) : base(message)
        {
        }
    }
}
