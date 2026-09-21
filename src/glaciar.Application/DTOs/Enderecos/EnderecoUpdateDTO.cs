using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Enderecos
{
    public class EnderecoUpdateDTO
    {
        public int UsuarioEnderecoId { get; set; } 
        
        public string Apelido { get; set; } = string.Empty; 
        public bool Padrao { get; set; }

        public string Cep { get; set; } = string.Empty;
        public string Logradouro { get; set; } = string.Empty;
        public string Numero { get; set; } = string.Empty;
        public string Complemento { get; set; } = string.Empty;
        public string Bairro { get; set; } = string.Empty;
        public string Cidade { get; set; } = string.Empty;
        public Estados Estado { get; set; }
    }
}