using AutoMapper;
using glaciar.Domain.Entities.Clientes;
using glaciar.Application.DTOs.Clientes;

namespace glaciar.Application.Mappings
{
    public class UsuarioProfile : Profile
    {
        public UsuarioProfile()
        {
            
            CreateMap<Usuario, UsuarioResponseDTO>()
                // Só precisamos ensinar as propriedades com nomes diferentes:
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.DataCadastro));
        }
    }
}