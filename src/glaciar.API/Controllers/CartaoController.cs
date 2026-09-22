using Microsoft.AspNetCore.Mvc;
using AutoMapper;
using glaciar.Application.DTOs.Clientes;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/cartoes")]
    public class CartaoController : ControllerBase
    {
        private readonly ICartaoService _cartaoService;
        private readonly IMapper _mapper;

        public CartaoController(ICartaoService cartaoService, IMapper mapper)
        {
            _cartaoService = cartaoService;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task<IActionResult> Criar([FromBody] CartaoCreateDTO dto)
        {
            try
            {
                var cartao = await _cartaoService.CreateAsync(dto);
                var resposta = _mapper.Map<CartaoResponseDTO>(cartao);
                return CreatedAtAction(
                    nameof(BuscarPorId),
                    new { usuarioId = dto.UsuarioId, usuarioCartaoId = resposta.Id },
                    resposta);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        [HttpGet("cliente/{usuarioId:int}")]
        public async Task<IActionResult> ListarPorCliente(int usuarioId)
        {
            try
            {
                var cartoes = await _cartaoService.GetByUsuarioAsync(usuarioId);
                return Ok(_mapper.Map<IEnumerable<CartaoResponseDTO>>(cartoes));
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        [HttpGet("{usuarioId:int}/{usuarioCartaoId:int}")]
        public async Task<IActionResult> BuscarPorId(int usuarioId, int usuarioCartaoId)
        {
            try
            {
                var cartao = await _cartaoService.GetByIdAsync(usuarioId, usuarioCartaoId);
                return Ok(_mapper.Map<CartaoResponseDTO>(cartao));
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        [HttpPut("{usuarioId:int}/{usuarioCartaoId:int}")]
        public async Task<IActionResult> Atualizar(
            int usuarioId,
            int usuarioCartaoId,
            [FromBody] CartaoUpdateDTO dto)
        {
            try
            {
                var cartao = await _cartaoService.UpdateAsync(usuarioId, usuarioCartaoId, dto);
                return Ok(_mapper.Map<CartaoResponseDTO>(cartao));
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        [HttpDelete("{usuarioId:int}/{usuarioCartaoId:int}")]
        public async Task<IActionResult> Inativar(int usuarioId, int usuarioCartaoId)
        {
            try
            {
                await _cartaoService.DeleteAsync(usuarioId, usuarioCartaoId);
                return NoContent();
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }
    }
}
