using Microsoft.AspNetCore.Mvc;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Exceptions;

namespace glaciar.API.Controllers
{
    [ApiController]
    [Route("api/admin/relatorios")]
    public class AdminRelatorioController : ControllerBase
    {
        private readonly IRelatorioVendasService _relatorioVendasService;
        private readonly IUsuarioService _usuarioService;

        public AdminRelatorioController(
            IRelatorioVendasService relatorioVendasService,
            IUsuarioService usuarioService)
        {
            _relatorioVendasService = relatorioVendasService;
            _usuarioService = usuarioService;
        }

        private async Task<bool> PossuiAcessoAdminAsync()
        {
            if (Request.Headers.TryGetValue("X-Perfil-Usuario", out var perfilValues))
            {
                var perfil = perfilValues.ToString().Trim();
                if (string.Equals(perfil, "CLI", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(perfil, "Cliente", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(perfil, "0", StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
            }

            if (Request.Headers.TryGetValue("X-Usuario-Id", out var idValues) &&
                int.TryParse(idValues.ToString(), out var usuarioId) &&
                usuarioId > 0)
            {
                if (!await _usuarioService.EhAdminAsync(usuarioId))
                {
                    return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Lista todas as categorias de produtos disponíveis para seleção dinâmica no filtro (RF0057).
        /// </summary>
        [HttpGet("categorias")]
        public async Task<IActionResult> ListarCategorias()
        {
            try
            {
                if (!await PossuiAcessoAdminAsync())
                {
                    const string msg = "Acesso restrito ao perfil ADMIN.";
                    return StatusCode(403, new { erro = msg });
                }

                var categorias = await _relatorioVendasService.ListarCategoriasAsync();
                return Ok(categorias);
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor ao listar categorias.";
                return StatusCode(500, new { erro = msg });
            }
        }

        /// <summary>
        /// Consulta otimizada do histórico de vendas por categoria agrupado por mês/ano (MM/yyyy),
        /// considerando estritamente pedidos ENTREGUES e preenchendo lacunas com 0.00 (RF0055, RF0056, RF0057, RN0071-RN0074, RNF0011).
        /// </summary>
        [HttpGet("vendas-por-categoria")]
        public async Task<IActionResult> ObterVendasPorCategoria(
            [FromQuery] DateTime? dataInicio,
            [FromQuery] DateTime? dataFim,
            [FromQuery] List<int>? categoriaIds = null,
            [FromQuery] List<string>? categorias = null)
        {
            try
            {
                if (!await PossuiAcessoAdminAsync())
                {
                    const string msg = "Acesso restrito ao perfil ADMIN.";
                    return StatusCode(403, new { erro = msg });
                }

                var idsSelecionados = new List<int>();
                var nomesSelecionados = new List<string>();

                if (categoriaIds != null)
                {
                    idsSelecionados.AddRange(categoriaIds.Where(id => id > 0));
                }

                if (categorias != null)
                {
                    foreach (var item in categorias)
                    {
                        if (string.IsNullOrWhiteSpace(item)) continue;

                        foreach (var token in item.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        {
                            if (int.TryParse(token, out var parsedId) && parsedId > 0)
                            {
                                idsSelecionados.Add(parsedId);
                            }
                            else
                            {
                                nomesSelecionados.Add(token);
                            }
                        }
                    }
                }

                var filtro = new FiltroVendasPorCategoriaDTO
                {
                    DataInicio = dataInicio,
                    DataFim = dataFim,
                    CategoriaIds = idsSelecionados,
                    CategoriasNomes = nomesSelecionados
                };

                var resultado = await _relatorioVendasService.ObterVendasPorCategoriaAsync(filtro);
                return Ok(resultado);
            }
            catch (DomainValidationException ex)
            {
                return BadRequest(new { erro = ex.Message });
            }
            catch (Exception)
            {
                const string msg = "Erro interno no servidor ao processar o relatório de vendas.";
                return StatusCode(500, new { erro = msg });
            }
        }
    }
}
