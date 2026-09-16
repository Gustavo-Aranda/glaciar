using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Entities.Clientes;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Domain.Exceptions;

namespace glaciar.Application.Services.Clientes
{
    public class UsuarioService
    {
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IPasswordHasher _hasher;

        public UsuarioService(IUsuarioRepository usuarioRepository, IPasswordHasher hasher)
        {
            _usuarioRepository = usuarioRepository;
            _hasher = hasher;
        }

        public async Task<Usuario> CreateUsuarioAsync(UsuarioCreateDTO usuarioCreateDTO)
        {
            if (!await IsCpfUniqueAsync(usuarioCreateDTO.Cpf))
            {
                throw new DomainValidationException("CPF já cadastrado.");
            }

            if (!await IsEmailUniqueAsync(usuarioCreateDTO.Email))
            {
                throw new DomainValidationException("Email já cadastrado.");
            }

            string senhaHash = _hasher.Hash(usuarioCreateDTO.Senha);

            var usuario = new Usuario
            {
                Nome = usuarioCreateDTO.Nome,
                Sobrenome = usuarioCreateDTO.Sobrenome,
                Cpf = usuarioCreateDTO.Cpf,
                Email = usuarioCreateDTO.Email,
                SenhaHash = senhaHash,
                TipoUsuario = Domain.Entities.Clientes.Enum.TipoUsuario.CLI
            };

            await _usuarioRepository.AddAsync(usuario);
            return usuario;
        }

        private async Task<bool> IsCpfUniqueAsync(string cpf)
        {
            var existingUsuario = await _usuarioRepository.GetByCPFAsync(cpf);
            return existingUsuario == null;
        }

        private async Task<bool> IsEmailUniqueAsync(string email)
        {
            var existingUsuario = await _usuarioRepository.GetByEmailAsync(email);
            return existingUsuario == null;
        }
    }
}