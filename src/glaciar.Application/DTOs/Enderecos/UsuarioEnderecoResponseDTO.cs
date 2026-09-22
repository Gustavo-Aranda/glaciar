namespace glaciar.Application.DTOs.Enderecos
{
    public class UsuarioEnderecoResponseDTO
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public int EnderecoId { get; set; }
        public string Apelido { get; set; } = string.Empty;
        public bool Padrao { get; set; }
        public bool Ativo { get; set; }
        public EnderecoResponseDTO? Endereco { get; set; }
    }
}