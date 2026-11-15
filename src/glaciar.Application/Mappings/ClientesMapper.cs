using glaciar.Application.DTOs.Clientes;
using glaciar.Application.DTOs.Enderecos;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Vendas;

namespace glaciar.Application.Mappings
{
    /// <summary>
    /// Mapeamento estático Entidade -> DTO do módulo de Clientes, Endereços, Cartões e Notificações.
    /// Substitui o uso de AutoMapper (zero reflexão em runtime e zero dependências externas).
    /// </summary>
    public static class ClientesMapper
    {
        public static UsuarioResponseDTO ParaUsuario(Usuario usuario) => new()
        {
            Id = usuario.Id,
            Nome = usuario.Nome,
            Sobrenome = usuario.Sobrenome,
            Cpf = usuario.Cpf,
            Email = usuario.Email,
            Telefone = usuario.Telefone,
            TipoUsuario = usuario.TipoUsuario,
            Ativo = usuario.Ativo,
            CreatedAt = usuario.DataCadastro
        };

        public static EnderecoResponseDTO ParaEndereco(Endereco endereco) => new()
        {
            Id = endereco.Id,
            Cep = endereco.Cep,
            Logradouro = endereco.Logradouro,
            Numero = endereco.Numero,
            Complemento = endereco.Complemento ?? string.Empty,
            Bairro = endereco.Bairro,
            Cidade = endereco.Cidade,
            Estado = endereco.Estado
        };

        public static UsuarioEnderecoResponseDTO ParaUsuarioEndereco(UsuarioEndereco vinculo) => new()
        {
            Id = vinculo.Id,
            UsuarioId = vinculo.UsuarioId,
            EnderecoId = vinculo.EnderecoId,
            Apelido = vinculo.Apelido,
            Padrao = vinculo.Padrao,
            Ativo = vinculo.Ativo,
            Endereco = vinculo.Endereco == null ? null : ParaEndereco(vinculo.Endereco)
        };

        public static CartaoResponseDTO ParaCartao(UsuarioCartao vinculo) => new()
        {
            Id = vinculo.Id,
            CartaoId = vinculo.CartaoId,
            UltimosDigitos = vinculo.Cartao?.UltimosDigitos ?? string.Empty,
            Bandeira = vinculo.Cartao?.Bandeira ?? default,
            MesValidade = vinculo.Cartao?.MesValidade ?? 0,
            AnoValidade = vinculo.Cartao?.AnoValidade ?? 0,
            Padrao = vinculo.Padrao
        };

        public static NotificacaoResponseDTO ParaNotificacao(Notificacao notificacao) => new()
        {
            Id = notificacao.Id,
            UsuarioId = notificacao.UsuarioId,
            PedidoId = notificacao.PedidoId,
            Mensagem = notificacao.Mensagem,
            Lida = notificacao.Lida,
            CreatedAt = notificacao.CreatedAt
        };
    }
}
