using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Clientes.Enum;
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

        public async Task<Usuario> CreateUsuarioAsync(UsuarioCreateDTO dto, TipoUsuario tipoUsuario = TipoUsuario.CLI)
        {
            if (!await IsCpfUniqueAsync(dto.Cpf))
                throw new DomainValidationException("CPF já cadastrado.");

            if (!await IsEmailUniqueAsync(dto.Email))
                throw new DomainValidationException("Email já cadastrado.");

            string senhaHash = _hasher.Hash(dto.Senha); 

            var usuario = new Usuario
            {
                Nome = dto.Nome,
                Sobrenome = dto.Sobrenome,
                Cpf = dto.Cpf,
                Email = dto.Email,
                SenhaHash = senhaHash,
                TipoUsuario = tipoUsuario
            };

            await _usuarioRepository.AddAsync(usuario);
            return usuario;
        }

        public async Task<IEnumerable<Usuario>> GetUsuariosAsync()
        {
            var usuarios = await _usuarioRepository.GetAllAsync();
            return usuarios;
        }

        public async Task<Usuario> GetUsuarioAsync(int id)
        {
            var usuario = await _usuarioRepository.GetByIdAsync(id);
            if (usuario == null)
            {
                throw new DomainValidationException("Usuário não encontrado no sistema.");
            }
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