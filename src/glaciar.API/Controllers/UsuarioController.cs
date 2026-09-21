using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Clientes;
using glaciar.Application.Services.Clientes;
using glaciar.Domain.Entities.Clientes.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/conta")]
    public class UsuarioController : ControllerBase
    {
        private readonly UsuarioService _usuarioService;

        public UsuarioController(UsuarioService usuarioService)
        {
            _usuarioService = usuarioService;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> CreateUsuario([FromBody] UsuarioCreateDTO dto)
        {
            try
            {
                var novoUsuario = await _usuarioService.CreateUsuarioAsync(dto, TipoUsuario.CLI);
                return CreatedAtAction(nameof(GetById), new { id = novoUsuario.Id }, novoUsuario);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Ocorreu um erro interno no servidor." });
            }
        }

        [HttpPost("admin/registrar")]
        public async Task<IActionResult> CreateUsuarioAdmin([FromBody] UsuarioAdminCreateDTO dto)
        {
            try
            {
                var dtoPadrao = new UsuarioCreateDTO
                {
                    Nome = dto.Nome, Sobrenome = dto.Sobrenome, Cpf = dto.Cpf,
                    Email = dto.Email, Senha = dto.Senha
                };

                var novoUsuario = await _usuarioService.CreateUsuarioAsync(dtoPadrao, dto.TipoUsuario);
                return CreatedAtAction(nameof(GetById), new { id = novoUsuario.Id }, novoUsuario);
            } catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            } catch (Exception)
            {
                return StatusCode(500, new { message = "Ocorreu um erro interno no servidor." });
            }
        }
        /*
        [HttpPost("login")]
        public async Task<IActionResult> LoginUsuario([FromBody] UsuarioLoginDTO dto) //TODO
        {
            // Implement login logic here
            return Ok();
        }
        */
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var usuario = await _usuarioService.GetUsuarioAsync(id);
                return Ok(usuario);
            }
            catch (DomainValidationException ex)
            {
                return NotFound(new { erro = ex.Message }); 
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsuarios()
        {
            IEnumerable<UsuarioResponseDTO> usuarios = await _usuarioService.GetUsuariosAsync();
            return Ok(usuarios);
        }
        
    }
}