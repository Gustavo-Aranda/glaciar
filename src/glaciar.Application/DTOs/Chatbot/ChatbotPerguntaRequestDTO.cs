using System.ComponentModel.DataAnnotations;

namespace glaciar.Application.DTOs.Chatbot
{
    public class ChatbotPerguntaRequestDTO : IValidatableObject
    {
        [Required(ErrorMessage = "A mensagem não pode estar vazia.")]
        [MinLength(2, ErrorMessage = "A mensagem deve conter ao menos 2 caracteres.")]
        [MaxLength(600, ErrorMessage = "A mensagem não pode exceder 600 caracteres.")]
        public string Mensagem { get; set; } = string.Empty;

        [MaxLength(200, ErrorMessage = "A preferência informada não pode exceder 200 caracteres.")]
        public string? PreferenciaInformada { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (string.IsNullOrWhiteSpace(Mensagem))
            {
                yield return new ValidationResult(
                    "A mensagem enviada ao assistente não pode conter apenas espaços em branco.",
                    new[] { nameof(Mensagem) });
            }
        }
    }
}
