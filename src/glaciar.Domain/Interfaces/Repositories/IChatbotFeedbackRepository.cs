using glaciar.Domain.Entities.Clientes;

namespace glaciar.Domain.Interfaces.Repositories
{
    public interface IChatbotFeedbackRepository
    {
        Task<ChatbotFeedback> AddAsync(ChatbotFeedback interacao);
        Task<ChatbotFeedback?> GetByIdAsync(int id, int usuarioId);
        Task UpdateAsync(ChatbotFeedback interacao);
        Task<IReadOnlyList<ChatbotFeedback>> GetHistoricoPorUsuarioAsync(int usuarioId, int limite = 20);
        Task<IReadOnlyList<ChatbotFeedback>> GetAvaliadosPorUsuarioAsync(int usuarioId, int limite = 30);
        Task<IReadOnlyList<ChatbotFeedback>> GetFeedbacksPositivosGlobaisAsync(int limite = 15);
    }
}
