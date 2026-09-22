using AutoMapper;
using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Entities.Clientes;

namespace glaciar.Application.Mappings
{
    public class CartaoProfile : Profile
    {
        public CartaoProfile()
        {
            CreateMap<UsuarioCartao, CartaoResponseDTO>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
                .ForMember(dest => dest.CartaoId, opt => opt.MapFrom(src => src.CartaoId))
                .ForMember(dest => dest.UltimosDigitos, opt => opt.MapFrom(src => src.Cartao.UltimosDigitos))
                .ForMember(dest => dest.Bandeira, opt => opt.MapFrom(src => src.Cartao.Bandeira))
                .ForMember(dest => dest.MesValidade, opt => opt.MapFrom(src => src.Cartao.MesValidade))
                .ForMember(dest => dest.AnoValidade, opt => opt.MapFrom(src => src.Cartao.AnoValidade));
        }
    }
}
