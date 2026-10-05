using glaciar.Domain.Entities.Vendas;
using glaciar.Domain.Entities.Vendas.Enum;
using glaciar.Domain.Exceptions;

namespace glaciar.Application.Services.Vendas
{
    /// <summary>
    /// Regras de elegibilidade de cupom compartilhadas entre a pré-validação (CupomService)
    /// e a finalização da compra (CheckoutService), para que as duas nunca divirjam.
    /// </summary>
    internal static class CupomRegras
    {
        public static bool EhTroca(Cupom cupom) =>
            string.Equals(cupom.CategoriaCupom, CategoriasCupom.Troca, StringComparison.OrdinalIgnoreCase);

        /// <summary>Tudo que não é cupom de troca é tratado como promocional.</summary>
        public static bool EhPromocional(Cupom cupom) => !EhTroca(cupom);

        public static void ValidarUso(Cupom? cupom, int usuarioId, string codigoInformado)
        {
            if (cupom == null)
                throw new DomainValidationException($"Cupom '{codigoInformado}' não encontrado.");

            if (!cupom.Ativo || cupom.QuantidadeMaximaUso <= 0)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' não está mais disponível.");

            if (cupom.DataValidade < DateTime.UtcNow)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' está expirado.");

            if (cupom.ValorDesconto <= 0)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' não possui valor válido.");

            // Cupom de troca é pessoal: só o dono do saldo pode usar.
            if (EhTroca(cupom) && cupom.UsuarioId != usuarioId)
                throw new DomainValidationException($"O cupom de troca '{cupom.Codigo}' não pertence a este cliente.");

            // Cupom promocional pode ser global (UsuarioId nulo) ou direcionado a um cliente.
            if (EhPromocional(cupom) && cupom.UsuarioId.HasValue && cupom.UsuarioId != usuarioId)
                throw new DomainValidationException($"O cupom '{cupom.Codigo}' não é válido para este cliente.");
        }
    }
}
