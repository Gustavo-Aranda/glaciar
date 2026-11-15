using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Enderecos;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/enderecos")]
    public class EnderecosController : ControllerBase
    {
        private readonly IEnderecoService _enderecoService;

        public EnderecosController(IEnderecoService enderecoService)
        {
            _enderecoService = enderecoService;
        }

        [HttpPost]
        public async Task<IActionResult> AdicionarEndereco([FromBody] EnderecoCreateDTO dto)
        {
            try
            {
                var resposta = await _enderecoService.CreateEnderecoAsync(dto);
                return CreatedAtAction(nameof(BuscarPorId), new { id = resposta.Id }, resposta);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
        }

        [HttpGet("cliente/{clienteId}")]
        public async Task<IActionResult> ListarEnderecos(int clienteId)
        {
            var enderecos = await _enderecoService.GetEnderecoClienteAsync(clienteId);
            return Ok(enderecos);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> BuscarPorId(int id)
        {
            var endereco = await _enderecoService.GetEnderecoAsync(id);
            if (endereco == null)
            {
                const string msg = "Endereço não encontrado.";
                return NotFound(new { erro = msg, message = msg });
            }

            return Ok(endereco);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEndereco(int id, [FromBody] EnderecoUpdateDTO dto)
        {
            try
            {
                if (id != dto.UsuarioEnderecoId)
                {
                    const string msg = "IDs incompatíveis.";
                    return BadRequest(new { erro = msg, message = msg });
                }

                await _enderecoService.UpdateEnderecoAsync(dto);
                return NoContent();
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoverEndereco(int id)
        {
            try
            {
                await _enderecoService.DisableEnderecoAsync(id);
                return NoContent();
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message, message = ex.Message });
            }
        }
    }
}
