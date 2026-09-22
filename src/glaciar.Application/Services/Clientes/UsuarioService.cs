using glaciar.Application.DTOs.Clientes;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Entities.Clientes.Enum;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Domain.Exceptions;
using AutoMapper;
using System.Globalization;
using System.ComponentModel.DataAnnotations;
using glaciar.Domain.Validators;

namespace glaciar.Application.Services.Clientes
{
    public class UsuarioService
    {
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IPasswordHasher _hasher;
        private readonly IMapper _mapper;

        public UsuarioService(IUsuarioRepository usuarioRepository, IPasswordHasher hasher, IMapper mapper)
        {
            _usuarioRepository = usuarioRepository;
            _hasher = hasher;
            _mapper = mapper;
        }

        public async Task<UsuarioResponseDTO> CreateUsuarioAsync(UsuarioCreateDTO dto, TipoUsuario tipoUsuario = TipoUsuario.CLI)
        {
            ValidarDadosObrigatorios(dto.Nome, dto.Sobrenome, dto.Email, dto.Senha, tipoUsuario);

            var cpf = CpfValidator.Normalizar(dto.Cpf);
            var email = NormalizarEmail(dto.Email);

            await ValidarDadosCadastraisAsync(cpf, email);

            var usuario = new Usuario
            {
                Nome = CapitalizarNome(dto.Nome),
                Sobrenome = CapitalizarNome(dto.Sobrenome),
                Cpf = cpf,
                Email = email,
                SenhaHash = _hasher.Hash(dto.Senha),
                TipoUsuario = tipoUsuario
            };

            await _usuarioRepository.AddAsync(usuario);
            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task<UsuarioResponseDTO> LoginAsync(UsuarioLoginDTO dto)
        {
            var email = NormalizarEmail(dto.Email);
            var usuario = await _usuarioRepository.GetByEmailAsync(email);

            if (usuario == null || !_hasher.Verify(dto.Senha, usuario.SenhaHash))
            {
                throw new DomainValidationException("E-mail ou senha inválidos.");
            }

            if (!usuario.Ativo)
            {
                throw new DomainValidationException("Esta conta está inativada. Entre em contato com o suporte.");
            }

            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task<IEnumerable<UsuarioResponseDTO>> GetUsuariosAsync()
        {
            var usuarios = await _usuarioRepository.GetAllAsync();
            
            return _mapper.Map<IEnumerable<UsuarioResponseDTO>>(usuarios);
        }

        public async Task<UsuarioResponseDTO> GetUsuarioAsync(int id)
        {
            var usuario = await ObterUsuarioAsync(id);

            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task<UsuarioResponseDTO> AtualizarUsuarioAsync(int id, UsuarioAdminUpdateDTO dto)
        {
            var usuario = await ObterUsuarioAsync(id);

            ValidarDadosObrigatorios(dto.Nome, dto.Sobrenome, dto.Email, dto.Senha, dto.TipoUsuario, senhaObrigatoria: false);

            var cpf = CpfValidator.Normalizar(dto.Cpf);
            var email = NormalizarEmail(dto.Email);

            await ValidarDadosCadastraisAsync(cpf, email, id);
            AtualizarDadosUsuario(usuario, dto, cpf, email);

            await _usuarioRepository.UpdateAsync(usuario);
            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task<UsuarioResponseDTO> AtualizarPerfilAsync(int id, UsuarioPerfilUpdateDTO dto)
        {
            var usuario = await ObterUsuarioAsync(id);
            var email = NormalizarEmail(dto.Email);

            ValidarDadosObrigatorios(
                dto.Nome,
                dto.Sobrenome,
                email,
                dto.Senha,
                usuario.TipoUsuario,
                senhaObrigatoria: false);

            var usuarioEmail = await _usuarioRepository.GetByEmailAsync(email);
            if (usuarioEmail != null && usuarioEmail.Id != id)
                throw new DomainValidationException("Email já cadastrado.");

            usuario.Nome = CapitalizarNome(dto.Nome);
            usuario.Sobrenome = CapitalizarNome(dto.Sobrenome);
            usuario.Email = email;

            if (!string.IsNullOrWhiteSpace(dto.Senha))
                usuario.SenhaHash = _hasher.Hash(dto.Senha);

            await _usuarioRepository.UpdateAsync(usuario);
            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task ExcluirUsuarioAsync(int id)
        {
            var usuario = await ObterUsuarioAsync(id);

            await _usuarioRepository.DeleteAsync(usuario);
        }

        public async Task<UsuarioResponseDTO> AlterarStatusUsuarioAsync(int id, bool ativo)
        {
            var usuario = await ObterUsuarioAsync(id);

            usuario.Ativo = ativo;
            await _usuarioRepository.UpdateAsync(usuario);

            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        private async Task<Usuario> ObterUsuarioAsync(int id)
        {
            var usuario = await _usuarioRepository.GetByIdAsync(id);
            if (usuario == null)
                throw new DomainValidationException("Usuário não encontrado no sistema.");

            return usuario;
        }

        private async Task ValidarDadosCadastraisAsync(string cpf, string email, int? usuarioId = null)
        {
            if (!CpfValidator.IsValido(cpf))
                throw new DomainValidationException("CPF inválido.");

            var usuarioCpf = await _usuarioRepository.GetByCPFAsync(cpf);
            if (usuarioCpf != null && usuarioCpf.Id != usuarioId)
                throw new DomainValidationException("CPF já cadastrado.");

            var usuarioEmail = await _usuarioRepository.GetByEmailAsync(email);
            if (usuarioEmail != null && usuarioEmail.Id != usuarioId)
                throw new DomainValidationException("Email já cadastrado.");
        }

        private static void ValidarDadosObrigatorios(
            string nome,
            string sobrenome,
            string email,
            string senha,
            TipoUsuario tipoUsuario,
            bool senhaObrigatoria = true)
        {
            if (string.IsNullOrWhiteSpace(nome) || nome.Trim().Length > 100)
                throw new DomainValidationException("Nome é obrigatório e deve ter até 100 caracteres.");

            if (string.IsNullOrWhiteSpace(sobrenome) || sobrenome.Trim().Length > 100)
                throw new DomainValidationException("Sobrenome é obrigatório e deve ter até 100 caracteres.");

            if (!new EmailAddressAttribute().IsValid(email?.Trim()))
                throw new DomainValidationException("Email inválido.");

            if (senhaObrigatoria && string.IsNullOrWhiteSpace(senha))
                throw new DomainValidationException("Senha é obrigatória.");

            if (!string.IsNullOrWhiteSpace(senha) && senha.Length > 255)
                throw new DomainValidationException("Senha deve ter até 255 caracteres.");

            if (!Enum.IsDefined(tipoUsuario))
                throw new DomainValidationException("Tipo de usuário inválido.");
        }

        private void AtualizarDadosUsuario(Usuario usuario, UsuarioAdminUpdateDTO dto, string cpf, string email)
        {
            usuario.Nome = CapitalizarNome(dto.Nome);
            usuario.Sobrenome = CapitalizarNome(dto.Sobrenome);
            usuario.Cpf = cpf;
            usuario.Email = email;
            usuario.TipoUsuario = dto.TipoUsuario;

            if (!string.IsNullOrWhiteSpace(dto.Senha))
                usuario.SenhaHash = _hasher.Hash(dto.Senha);
        }

        private static string NormalizarEmail(string email)
        {
            return email.Trim().ToLowerInvariant();
        }

        private static string CapitalizarNome(string nome)
        {
            var texto = nome.Trim().ToLower(new CultureInfo("pt-BR"));
            return new CultureInfo("pt-BR").TextInfo.ToTitleCase(texto);
        }

    }
}