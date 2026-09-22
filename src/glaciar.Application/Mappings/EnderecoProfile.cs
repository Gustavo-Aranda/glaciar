using AutoMapper;
using glaciar.Application.DTOs.Enderecos;
using glaciar.Domain.Entities.Clientes;

namespace glaciar.Application.Mappings
{
    public class EnderecoProfile : Profile
    {
        public EnderecoProfile()
        {
            CreateMap<Endereco, EnderecoResponseDTO>();
            CreateMap<UsuarioEndereco, UsuarioEnderecoResponseDTO>();
        }
    }
}