using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.Interfaces.Services
{
    public interface IFreteService
    {
        decimal Calcular(Estados estadoDestino, int quantidadeUnidades);
    }
}
