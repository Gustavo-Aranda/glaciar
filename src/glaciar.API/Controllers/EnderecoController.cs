using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Enderecos;
using glaciar.Application.Services.Enderecos;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/enderecos")]
    public class EnderecosController : ControllerBase
    {
        private readonly EnderecoService _enderecoService;

        public EnderecosController(EnderecoService enderecoService)
        {
            _enderecoService = enderecoService;
        }

        // ==========================================
        // CREATE: Adicionar um novo endereço
        // ==========================================
        [HttpPost]
        public async Task<IActionResult> AdicionarEndereco([FromBody] EnderecoCreateDTO dto)
        {
            try
            {
                var novoEndereco = await _enderecoService.CreateEnderecoAsync(dto);
                return CreatedAtAction(nameof(BuscarPorId), new { id = novoEndereco.Id }, novoEndereco);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        // ==========================================
        // READ: Listar endereços de um cliente específico
        // ==========================================
        [HttpGet("cliente/{clienteId}")]
        public async Task<IActionResult> ListarEnderecos(int clienteId)
        {
            var enderecos = await _enderecoService.GetEnderecoClienteAsync(clienteId);
            return Ok(enderecos);
        }

        // ==========================================
        // READ: Buscar um endereço específico
        // ==========================================
        [HttpGet("{id}")]
        public async Task<IActionResult> BuscarPorId(int id)
        {
            var endereco = await _enderecoService.GetEnderecoAsync(id);
            if (endereco == null) return NotFound(new { erro = "Endereço não encontrado." });
            
            return Ok(endereco);
        }

        // ==========================================
        // UPDATE: Editar um endereço existente
        // ==========================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEndereco(int id, [FromBody] EnderecoUpdateDTO dto)
        {
            try
            {
                if (id != dto.UsuarioEnderecoId) 
                    return BadRequest(new { erro = "IDs incompatíveis." });

                await _enderecoService.UpdateEnderecoAsync(dto);
                return NoContent(); 
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
        }

        // ==========================================
        // DELETE: Remover um endereço
        // ==========================================
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
                return BadRequest(new { erro = ex.Message });
            }
        }
    }
}