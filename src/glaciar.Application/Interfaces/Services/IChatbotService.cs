using glaciar.Application.DTOs.Chatbot;

namespace glaciar.Application.Interfaces.Services
{
    public interface IChatbotService
    {
        Task<ChatbotRespostaDTO> ProcessarMensagemAsync(
            int usuarioId,
            ChatbotPerguntaRequestDTO dto,
            CancellationToken cancellationToken = default);

        Task RegistrarFeedbackAsync(int usuarioId, ChatbotFeedbackRequestDTO dto);

        Task<IReadOnlyList<ChatbotRespostaDTO>> ObterHistoricoAsync(int usuarioId);
    }
}
