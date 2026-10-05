using glaciar.Application.DTOs.Enderecos;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.Repositories;
using AutoMapper;

namespace glaciar.Application.Services.Enderecos
{
    public class EnderecoService : IEnderecoService
    {
        private readonly IEnderecoRepository _enderecoRepository;
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IUsuarioEnderecoRepository _usuarioEnderecoRepository;
        private readonly IMapper _mapper;

        public EnderecoService(
            IEnderecoRepository enderecoRepository, 
            IUsuarioRepository usuarioRepository,
            IUsuarioEnderecoRepository usuarioEnderecoRepository,
            IMapper mapper)
        {
            _enderecoRepository = enderecoRepository;
            _usuarioRepository = usuarioRepository;
            _usuarioEnderecoRepository = usuarioEnderecoRepository;
            _mapper = mapper;
        }

        // ==========================================
        // CREATE: Orquestração Limpa e Semântica
        // ==========================================
        public async Task<EnderecoResponseDTO> CreateEnderecoAsync(EnderecoCreateDTO dto)
        {
            ValidarDadosEndereco(dto.Cep, dto.Logradouro, dto.Numero, dto.Bairro, dto.Cidade, dto.Apelido);
            await ValidarSeClienteExisteAsync(dto.UsuarioId);

            var enderecoFisico = await ObterOuRegistrarEnderecoFisicoAsync(dto);

            await AjustarEnderecoPadraoAnteriorAsync(dto.UsuarioId, dto.Padrao);

            await CriarVinculoDeEnderecoAsync(dto, enderecoFisico.Id);

            return _mapper.Map<EnderecoResponseDTO>(enderecoFisico);
        }

        // ==========================================
        // READ: Métodos de Consulta
        // ==========================================
        public async Task<IEnumerable<UsuarioEnderecoResponseDTO>> GetEnderecoClienteAsync(int clienteId)
        {
            var vinculos = await _usuarioEnderecoRepository.GetAtivosByUsuarioIdAsync(clienteId);
            return _mapper.Map<IEnumerable<UsuarioEnderecoResponseDTO>>(vinculos);
        }

        public async Task<EnderecoResponseDTO?> GetEnderecoAsync(int id)
        {
            var endereco = await _enderecoRepository.GetByIdAsync(id);
            return endereco == null ? null : _mapper.Map<EnderecoResponseDTO>(endereco);
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
                var totalVinculos = await _usuarioEnderecoRepository.CountVinculosByEnderecoIdAsync(vinculo.EnderecoId);

                // Se o Endereço estiver associado a múltiplos vínculos, não alteramos o registro original
                // para evitar efeito colateral em outros clientes. Instanciamos e persistimos um novo.
                if (totalVinculos > 1)
                {
                    var novoEndereco = new Endereco
                    {
                        Cep = dto.Cep,
                        Logradouro = dto.Logradouro,
                        Numero = dto.Numero,
                        Complemento = dto.Complemento,
                        Bairro = dto.Bairro,
                        Cidade = dto.Cidade,
                        Estado = dto.Estado
                    };

                    await _enderecoRepository.AddAsync(novoEndereco);
                    vinculo.EnderecoId = novoEndereco.Id;
                    vinculo.Endereco = novoEndereco;
                }
                else
                {
                    AtualizarDadosFisicosDaRua(vinculo.Endereco, dto);
                    await _enderecoRepository.UpdateAsync(vinculo.Endereco);
                }
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