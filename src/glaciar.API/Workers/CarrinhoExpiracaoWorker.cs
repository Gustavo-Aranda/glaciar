using glaciar.Application.Interfaces.Services;

namespace glaciar.API.Workers
{
    /// <summary>
    /// Worker em background que periodicamente (a cada 30 segundos) varre o banco de dados
    /// em busca de carrinhos cujos 10 minutos de reserva expiraram.
    /// Esvazia o carrinho e devolve as unidades à disponibilidade do estoque.
    /// </summary>
    public class CarrinhoExpiracaoWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<CarrinhoExpiracaoWorker> _logger;

        public CarrinhoExpiracaoWorker(
            IServiceScopeFactory scopeFactory,
            ILogger<CarrinhoExpiracaoWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));

            while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var expiracaoService = scope.ServiceProvider.GetRequiredService<ICarrinhoExpiracaoService>();

                    var expirados = await expiracaoService.ExpirarVencidosAsync();
                    if (expirados > 0)
                    {
                        _logger.LogInformation("CarrinhoExpiracaoWorker: {Quantidade} carrinho(s) expirado(s) e devolvido(s) ao estoque.", expirados);
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao processar expiração de carrinhos vencidos.");
                }
            }
        }
    }
}
