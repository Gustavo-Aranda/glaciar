using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Clientes
{
    public class UsuarioUpdateDTO
    {
        public string Nome { get; set; } = string.Empty;
        public string Sobrenome { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Senha { get; set; } = string.Empty;
        public TipoUsuario TipoUsuario { get; set; }
    }
}
