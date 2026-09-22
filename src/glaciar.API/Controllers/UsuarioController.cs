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
                    Email = dto.Email, Telefone = dto.Telefone, Senha = dto.Senha
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
        [HttpPost("login")]
        public async Task<IActionResult> LoginUsuario([FromBody] UsuarioLoginDTO dto)
        {
            try
            {
                var usuario = await _usuarioService.LoginAsync(dto);
                return Ok(usuario);
            }
            catch (DomainValidationException ex)
            {
                return Unauthorized(new { erro = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Ocorreu um erro interno no servidor." });
            }
        }
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

        [HttpPut("{id}")]
        public async Task<IActionResult> AtualizarUsuario(int id, [FromBody] UsuarioAdminUpdateDTO dto)
        {
            try
            {
                var usuario = await _usuarioService.AtualizarUsuarioAsync(id, dto);
                return Ok(usuario);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        [HttpPut("{id}/perfil")]
        public async Task<IActionResult> AtualizarPerfil(int id, [FromBody] UsuarioPerfilUpdateDTO dto)
        {
            try
            {
                var usuario = await _usuarioService.AtualizarPerfilAsync(id, dto);
                return Ok(usuario);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> ExcluirUsuario(int id)
        {
            try
            {
                await _usuarioService.ExcluirUsuarioAsync(id);
                return NoContent();
            }
            catch (DomainValidationException ex)
            {
                return NotFound(new { erro = ex.Message });
            }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> AlterarStatus(int id, [FromBody] UsuarioStatusDTO dto)
        {
            try
            {
                var usuario = await _usuarioService.AlterarStatusUsuarioAsync(id, dto.Ativo);
                return Ok(usuario);
            }
            catch (DomainValidationException ex)
            {
                return NotFound(new { erro = ex.Message });
            }
        }
        
    }
}