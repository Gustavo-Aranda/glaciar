using glaciar.Application.DTOs.Enderecos;
using glaciar.Domain.Entities;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Enderecos
{
    public class EnderecoService
    {
        private readonly IEnderecoRepository _enderecoRepository;
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IUsuarioEnderecoRepository _usuarioEnderecoRepository;

        public EnderecoService(
            IEnderecoRepository enderecoRepository, 
            IUsuarioRepository usuarioRepository,
            IUsuarioEnderecoRepository usuarioEnderecoRepository)
        {
            _enderecoRepository = enderecoRepository;
            _usuarioRepository = usuarioRepository;
            _usuarioEnderecoRepository = usuarioEnderecoRepository;
        }

        // ==========================================
        // CREATE: Orquestração Limpa e Semântica
        // ==========================================
        public async Task<Endereco> CreateEnderecoAsync(EnderecoCreateDTO dto)
        {
            ValidarDadosEndereco(dto.Cep, dto.Logradouro, dto.Numero, dto.Bairro, dto.Cidade, dto.Apelido);
            await ValidarSeClienteExisteAsync(dto.UsuarioId);

            var enderecoFisico = await ObterOuRegistrarEnderecoFisicoAsync(dto);

            await AjustarEnderecoPadraoAnteriorAsync(dto.UsuarioId, dto.Padrao);

            await CriarVinculoDeEnderecoAsync(dto, enderecoFisico.Id);

            return enderecoFisico;
        }

        // ==========================================
        // READ: Métodos de Consulta
        // ==========================================
        public async Task<IEnumerable<UsuarioEndereco>> GetEnderecoClienteAsync(int clienteId)
        {
            return await _usuarioEnderecoRepository.GetAtivosByUsuarioIdAsync(clienteId);
        }

        public async Task<Endereco?> GetEnderecoAsync(int id)
        {
            return await _enderecoRepository.GetByIdAsync(id);
        }

        // ==========================================
        // UPDATE: Regras separadas do fluxo principal
        // ==========================================
        public async Task UpdateEnderecoAsync(EnderecoUpdateDTO dto)
        {
            ValidarDadosEndereco(dto.Cep, dto.Logradouro, dto.Numero, dto.Bairro, dto.Cidade, dto.Apelido);
            var vinculo = await ObterVinculoValidadoAsync(dto.UsuarioEnderecoId);

            await AtualizarRegraDeEnderecoPadraoAsync(vinculo, dto.Padrao);
            
            vinculo.Apelido = dto.Apelido;

            if (vinculo.Endereco != null)
            {
                AtualizarDadosFisicosDaRua(vinculo.Endereco, dto);
                await _enderecoRepository.UpdateAsync(vinculo.Endereco);
            }

            await _usuarioEnderecoRepository.UpdateAsync(vinculo);
        }

        // ==========================================
        // DELETE: O verdadeiro Soft Delete
        // ==========================================
        public async Task DisableEnderecoAsync(int usuarioEnderecoId)
        {
            var vinculo = await ObterVinculoValidadoAsync(usuarioEnderecoId);

            vinculo.Padrao = false; 
            vinculo.Ativo = false;  

            await _usuarioEnderecoRepository.UpdateAsync(vinculo);
        }


        // ==========================================
        // 🔒 MÉTODOS PRIVADOS (Os detalhes da operação)
        // ==========================================

        private async Task ValidarSeClienteExisteAsync(int usuarioId)
        {
            var cliente = await _usuarioRepository.GetByIdAsync(usuarioId);
            if (cliente == null)
                throw new DomainValidationException("O cliente informado não existe no sistema.");
        }

        private static void ValidarDadosEndereco(
            string cep,
            string logradouro,
            string numero,
            string bairro,
            string cidade,
            string apelido)
        {
            if (string.IsNullOrWhiteSpace(cep) || cep.Replace("-", string.Empty).Length != 8)
                throw new DomainValidationException("O CEP informado é inválido.");

            if (string.IsNullOrWhiteSpace(logradouro))
                throw new DomainValidationException("O logradouro é obrigatório.");

            if (string.IsNullOrWhiteSpace(numero))
                throw new DomainValidationException("O número do endereço é obrigatório.");

            if (string.IsNullOrWhiteSpace(bairro))
                throw new DomainValidationException("O bairro é obrigatório.");

            if (string.IsNullOrWhiteSpace(cidade))
                throw new DomainValidationException("A cidade é obrigatória.");

            if (string.IsNullOrWhiteSpace(apelido))
                throw new DomainValidationException("O apelido do endereço é obrigatório.");
        }

        private async Task<Endereco> ObterOuRegistrarEnderecoFisicoAsync(EnderecoCreateDTO dto)
        {
            var endereco = await _enderecoRepository.BuscarPorCepENumeroAsync(dto.Cep, dto.Numero);

            if (endereco == null)
            {
                endereco = new Endereco
                {
                    Cep = dto.Cep,
                    Logradouro = dto.Logradouro,
                    Numero = dto.Numero,
                    Complemento = dto.Complemento,
                    Bairro = dto.Bairro,
                    Cidade = dto.Cidade,
                    Estado = dto.Estado
                };
                
                await _enderecoRepository.AddAsync(endereco);
            }

            return endereco;
        }

        private async Task AjustarEnderecoPadraoAnteriorAsync(int usuarioId, bool seraPadrao)
        {
            if (seraPadrao)
            {
                await _usuarioEnderecoRepository.RemoverPadraoDoUsuarioAsync(usuarioId);
            }
        }

        private async Task CriarVinculoDeEnderecoAsync(EnderecoCreateDTO dto, int enderecoFisicoId)
        {
            var vinculo = new UsuarioEndereco
            {
                UsuarioId = dto.UsuarioId,
                EnderecoId = enderecoFisicoId,
                Apelido = dto.Apelido,
                Padrao = dto.Padrao,
                Ativo = true 
            };

            await _usuarioEnderecoRepository.AddAsync(vinculo);
        }

        private async Task<UsuarioEndereco> ObterVinculoValidadoAsync(int usuarioEnderecoId)
        {
            var vinculo = await _usuarioEnderecoRepository.GetByIdAsync(usuarioEnderecoId);
            if (vinculo == null)
                throw new DomainValidationException("Vínculo de endereço não encontrado.");
                
            return vinculo;
        }

        private async Task AtualizarRegraDeEnderecoPadraoAsync(UsuarioEndereco vinculo, bool novoStatusPadrao)
        {
            if (novoStatusPadrao && !vinculo.Padrao)
            {
                await _usuarioEnderecoRepository.RemoverPadraoDoUsuarioAsync(vinculo.UsuarioId);
                vinculo.Padrao = true;
            }
            else if (!novoStatusPadrao)
            {
                vinculo.Padrao = false;
            }
        }

        private void AtualizarDadosFisicosDaRua(Endereco endereco, EnderecoUpdateDTO dto)
        {
            endereco.Cep = dto.Cep;
            endereco.Logradouro = dto.Logradouro;
            endereco.Numero = dto.Numero;
            endereco.Complemento = dto.Complemento;
            endereco.Bairro = dto.Bairro;
            endereco.Cidade = dto.Cidade;
            endereco.Estado = dto.Estado;
        }
    }
}