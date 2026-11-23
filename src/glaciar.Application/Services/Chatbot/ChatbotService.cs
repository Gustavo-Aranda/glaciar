using System.Globalization;
using System.Text;
using glaciar.Application.DTOs.Chatbot;
using glaciar.Application.DTOs.Vendas;
using glaciar.Application.Interfaces.Services;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Exceptions;
using glaciar.Domain.Interfaces.AI;
using glaciar.Domain.Interfaces.Repositories;

namespace glaciar.Application.Services.Chatbot
{
    public class ChatbotService : IChatbotService
    {
        private const int MaxProdutosPorResposta = 4;
        private static readonly CultureInfo CulturaPtBr = CultureInfo.GetCultureInfo("pt-BR");

        public const string RespostaPadraoForaDeEscopo =
            "Não posso ajudar com isso. Como assistente da Glaciar, atendo exclusivamente a questões relacionadas a equipamentos de trekking, roupas e acessórios para atividades ao ar livre. Se você tiver alguma dúvida sobre equipamentos ou produtos, ficarei feliz em ajudar!";

        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IPedidoRepository _pedidoRepository;
        private readonly IProdutoService _produtoService;
        private readonly IChatbotFeedbackRepository _feedbackRepository;
        private readonly IOllamaAiService _ollamaAiService;

        public ChatbotService(
            IUsuarioRepository usuarioRepository,
            IPedidoRepository pedidoRepository,
            IProdutoService produtoService,
            IChatbotFeedbackRepository feedbackRepository,
            IOllamaAiService ollamaAiService)
        {
            _usuarioRepository = usuarioRepository;
            _pedidoRepository = pedidoRepository;
            _produtoService = produtoService;
            _feedbackRepository = feedbackRepository;
            _ollamaAiService = ollamaAiService;
        }

        public async Task<ChatbotRespostaDTO> ProcessarMensagemAsync(
            int usuarioId,
            ChatbotPerguntaRequestDTO dto,
            CancellationToken cancellationToken = default)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Mensagem))
                throw new DomainValidationException("Digite uma mensagem para conversar com a Glaucia.");

            var mensagem = dto.Mensagem.Trim();

            var usuario = await _usuarioRepository.GetByIdAsync(usuarioId)
                ?? throw new EntidadeNaoEncontradaException("Cliente não encontrado.");

            var catalogo = (await _produtoService.ListarVisiveisAsync()).ToList();

            var systemPrompt = await MontarPromptPersonaGlauciaAsync(usuario, catalogo);

            // Histórico mínimo (1 turno) e limpo de recusas anteriores para economizar tokens na CPU
            var historicoBruto = await _feedbackRepository.GetHistoricoPorUsuarioAsync(usuarioId, limite: 4);
            var turnosRecentes = historicoBruto
                .Where(h => !string.IsNullOrWhiteSpace(h.RespostaIa) &&
                            !h.RespostaIa.Contains("Não posso ajudar com isso", StringComparison.OrdinalIgnoreCase))
                .OrderBy(h => h.DataInteracao)
                .TakeLast(1)
                .Select(h => (h.PerguntaUsuario, h.RespostaIa))
                .ToList();

            var respostaBruta = await _ollamaAiService.GerarRecomendacaoAsync(
                systemPrompt,
                mensagem,
                turnosRecentes,
                cancellationToken);

            var respostaIa = respostaBruta.Trim();

            var ehRecusaForaDeEscopo = respostaIa.Contains(
                "Não posso ajudar com isso",
                StringComparison.OrdinalIgnoreCase);

            var produtosRecomendados = ehRecusaForaDeEscopo
                ? new List<ProdutoRecomendadoDTO>()
                : IdentificarProdutosCitados(respostaIa, catalogo);

            return await SalvarERetornarAsync(usuarioId, mensagem, respostaIa, produtosRecomendados);
        }

        private async Task<ChatbotRespostaDTO> SalvarERetornarAsync(
            int usuarioId,
            string mensagem,
            string respostaIa,
            List<ProdutoRecomendadoDTO> produtosRecomendados)
        {
            var interacao = ChatbotFeedback.CriarInteracao(
                usuarioId,
                mensagem,
                respostaIa,
                produtosRecomendados.Select(p => p.Nome));

            var salvo = await _feedbackRepository.AddAsync(interacao);

            return new ChatbotRespostaDTO
            {
                InteracaoId = salvo.Id,
                Pergunta = salvo.PerguntaUsuario,
                Resposta = salvo.RespostaIa,
                ProdutosRecomendados = produtosRecomendados,
                Util = salvo.Util,
                DataInteracao = salvo.DataInteracao
            };
        }

        public async Task RegistrarFeedbackAsync(int usuarioId, ChatbotFeedbackRequestDTO dto)
        {
            var interacao = await _feedbackRepository.GetByIdAsync(dto.InteracaoId, usuarioId)
                ?? throw new EntidadeNaoEncontradaException("Interação do chatbot não encontrada para este cliente.");

            interacao.RegistrarAvaliacao(dto.Util, dto.Comentario);
            await _feedbackRepository.UpdateAsync(interacao);
        }

        public async Task<IReadOnlyList<ChatbotRespostaDTO>> ObterHistoricoAsync(int usuarioId)
        {
            _ = await _usuarioRepository.GetByIdAsync(usuarioId)
                ?? throw new EntidadeNaoEncontradaException("Cliente não encontrado.");

            var historico = await _feedbackRepository.GetHistoricoPorUsuarioAsync(usuarioId, limite: 20);
            var catalogoPorNome = (await _produtoService.ListarVisiveisAsync())
                .GroupBy(p => p.Nome, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            return historico
                .OrderBy(h => h.DataInteracao)
                .Select(h => new ChatbotRespostaDTO
                {
                    InteracaoId = h.Id,
                    Pergunta = h.PerguntaUsuario,
                    Resposta = h.RespostaIa,
                    ProdutosRecomendados = h.ListarProdutosRecomendados()
                        .Where(catalogoPorNome.ContainsKey)
                        .Select(nome => ParaRecomendado(catalogoPorNome[nome]))
                        .ToList(),
                    Util = h.Util,
                    DataInteracao = h.DataInteracao
                })
                .ToList();
        }

        private async Task<string> MontarPromptPersonaGlauciaAsync(
            Usuario usuario,
            List<ProdutoCatalogoDTO> catalogo)
        {
            var itensComprados = await _pedidoRepository.GetDescricaoItensCompradosAsync(usuario.Id);
            var feedbacks = await _feedbackRepository.GetAvaliadosPorUsuarioAsync(usuario.Id, limite: 10);

            var sb = new StringBuilder();
            sb.AppendLine("<regras_persona_e_guardrails>");
            sb.AppendLine("1. Use apenas os nomes e preços exatos de <catalogo_glaciar> (1 a 2 itens com **nome em negrito** e preço em R$). Nunca misture nomes de produtos diferentes nem cite o nome de itens que você não está recomendando.");
            sb.AppendLine("2. Cite apenas o nome exato do produto em negrito e o preço em R$, sem mencionar tamanho ou cor.");
            sb.AppendLine("3. Respeite <perfil_cliente>: complemente 'Compras anteriores', priorize 'Úteis' e NUNCA repita 'Não Úteis'.");
            sb.AppendLine($"4. Recuse apenas temas fora de outdoor ou sem nexo respondendo só: \"{RespostaPadraoForaDeEscopo}\"");
            sb.AppendLine("</regras_persona_e_guardrails>");
            sb.AppendLine();
            sb.AppendLine("<perfil_cliente>");
            sb.AppendLine($"Cliente: {Sanitizar(usuario.Nome)} {Sanitizar(usuario.Sobrenome)}");
            sb.AppendLine(itensComprados.Count > 0
                ? $"Compras anteriores: {string.Join("; ", itensComprados.Select(Sanitizar))}"
                : "Compras anteriores: nenhuma.");

            var uteis = NomesAvaliados(feedbacks, util: true);
            sb.AppendLine(uteis.Count > 0
                ? $"Avaliados como Úteis: {string.Join(", ", uteis.Select(Sanitizar))}"
                : "Avaliados como Úteis: nenhum.");

            var naoUteis = NomesAvaliados(feedbacks, util: false);
            sb.AppendLine(naoUteis.Count > 0
                ? $"Avaliados como Não Úteis (NÃO recomendar): {string.Join(", ", naoUteis.Select(Sanitizar))}"
                : "Avaliados como Não Úteis (NÃO recomendar): nenhum.");
            sb.AppendLine("</perfil_cliente>");
            sb.AppendLine();
            sb.AppendLine("<catalogo_glaciar>");
            foreach (var p in catalogo)
            {
                var precoFormatado = p.Preco.ToString("N2", CulturaPtBr);
                sb.AppendLine($"- {Sanitizar(p.Nome)} | {Sanitizar(p.Categoria)} | R$ {precoFormatado}");
            }
            sb.AppendLine("</catalogo_glaciar>");

            return sb.ToString();
        }

        private static string Sanitizar(string? valor) =>
            string.IsNullOrWhiteSpace(valor)
                ? string.Empty
                : valor
                    .Replace("<", "&lt;")
                    .Replace(">", "&gt;")
                    .Replace("\r", " ")
                    .Replace("\n", " ")
                    .Trim();

        private static List<string> NomesAvaliados(IReadOnlyList<ChatbotFeedback> feedbacks, bool util) =>
            feedbacks
                .Where(f => f.Util == util)
                .SelectMany(f => f.ListarProdutosRecomendados())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        private static List<ProdutoRecomendadoDTO> IdentificarProdutosCitados(string respostaIa, List<ProdutoCatalogoDTO> catalogo)
        {
            if (string.IsNullOrWhiteSpace(respostaIa))
                return new List<ProdutoRecomendadoDTO>();

            return catalogo
                .Select(p => (Produto: p, Indice: respostaIa.IndexOf(p.Nome, StringComparison.OrdinalIgnoreCase)))
                .Where(x => x.Indice >= 0)
                .OrderBy(x => x.Indice)
                .Select(x => ParaRecomendado(x.Produto))
                .Take(MaxProdutosPorResposta)
                .ToList();
        }

        private static ProdutoRecomendadoDTO ParaRecomendado(ProdutoCatalogoDTO p) => new()
        {
            ProdutoId = p.Id,
            Nome = p.Nome,
            Categoria = p.Categoria,
            Preco = p.Preco
        };
    }
}
