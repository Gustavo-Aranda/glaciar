using System.ComponentModel.DataAnnotations;

namespace glaciar.Application.DTOs.Chatbot
{
    public class ChatbotFeedbackRequestDTO
    {
        [Required]
        public int InteracaoId { get; set; }

        [Required]
        public bool Util { get; set; }

        [MaxLength(500)]
        public string? Comentario { get; set; }
    }
}
