using System.Text.RegularExpressions;

namespace glaciar.Domain.Validators
{
    public static class CpfValidator
    {
        public static string Normalizar(string cpf)
        {
            return Regex.Replace(cpf ?? string.Empty, @"\D", string.Empty);
        }

        public static bool IsValido(string cpfInput)
        {
            var cpf = Normalizar(cpfInput);

            if (cpf.Length != 11 || cpf.Distinct().Count() == 1)
                return false;

            var primeiroDigito = CalcularDigito(cpf, 9);
            if (cpf[9] - '0' != primeiroDigito)
                return false;

            var segundoDigito = CalcularDigito(cpf, 10);
            return cpf[10] - '0' == segundoDigito;
        }

        private static int CalcularDigito(string cpf, int quantidadeDigitos)
        {
            var soma = 0;
            var peso = quantidadeDigitos + 1;

            for (var indice = 0; indice < quantidadeDigitos; indice++)
                soma += (cpf[indice] - '0') * (peso - indice);

            var resto = soma % 11;
            return resto < 2 ? 0 : 11 - resto;
        }
    }
}
