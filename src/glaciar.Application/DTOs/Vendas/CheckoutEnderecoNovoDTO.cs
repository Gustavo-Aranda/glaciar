using glaciar.Domain.Entities.Clientes.Enum;

namespace glaciar.Application.DTOs.Vendas
{
    public class CheckoutEnderecoNovoDTO
    {
        public string Cep { get; set; } = string.Empty;
        public string Logradouro { get; set; } = string.Empty;
        public string Numero { get; set; } = string.Empty;
        public string Complemento { get; set; } = string.Empty;
        public string Bairro { get; set; } = string.Empty;
        public string Cidade { get; set; } = string.Empty;
        public Estados Estado { get; set; }

        /// <summary>Se true, o endereço passa a constar no perfil do cliente (cria UsuarioEndereco).</summary>
        public bool SalvarNoPerfil { get; set; }

        /// <summary>Obrigatório apenas quando SalvarNoPerfil = true.</summary>
        public string Apelido { get; set; } = string.Empty;
    }
}
