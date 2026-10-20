namespace glaciar.Application.DTOs.Clientes
{
    public class NotificacaoResponseDTO
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public int? PedidoId { get; set; }
        public string Mensagem { get; set; } = string.Empty;
        public bool Lida { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
