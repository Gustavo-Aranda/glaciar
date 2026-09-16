using System;
using System.Security.Cryptography;
using glaciar.Application.Interfaces.Services;

namespace glaciar.Infrastructure.Security
{
    public class PasswordHasher : IPasswordHasher
    {   
        private const int SaltSize = 16; // 128 bits
        private const int KeySize = 32; // 256 bits
        private const int Iterations = 600_000;
        private static readonly HashAlgorithmName HashAlgorithm = HashAlgorithmName.SHA256;
        private const char Delimiter = ';';

        /// <summary>
        /// Cria um hash seguro a partir de uma senha em texto simples.
        /// Retorna uma string que contém o hash da senha e o salt, separados por um delimitador.
        /// </summary>

        public string Hash(string password)
        {
            // Gera um salt aleatório
            byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

            // Deriva a chave (hash) usando PBKDF2
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                Iterations,
                HashAlgorithm,
                KeySize
            );

            // Transforma tudo em strings Hexadecimais e une com um delimitador
            return string.Join(Delimiter, 
                Convert.ToHexString(salt), 
                Iterations,
                Convert.ToHexString(hash)
            );
        }

        public bool Verify(string password, string hashedPassword)
        {
            // Divide a string do hash em suas partes
            string[] parts = hashedPassword.Split(Delimiter);
            if (parts.Length != 3)
            {
                throw new FormatException("O hash da senha não está no formato esperado.");
            }

            byte[] salt = Convert.FromHexString(parts[0]);
            int iterations = int.Parse(parts[1]);
            byte[] hash = Convert.FromHexString(parts[2]);

            // Deriva a chave (hash) da senha fornecida usando o mesmo salt e número de iterações
            byte[] inputHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithm,
                KeySize
            );

            // Compara os hashes de forma segura
            return CryptographicOperations.FixedTimeEquals(hash, inputHash);
        }   
    }
}
