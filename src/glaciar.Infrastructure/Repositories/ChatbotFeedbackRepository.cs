using Microsoft.EntityFrameworkCore;
using glaciar.Domain.Entities.Clientes;
using glaciar.Domain.Interfaces.Repositories;
using glaciar.Infrastructure.Data;

namespace glaciar.Infrastructure.Repositories
{
    public class ChatbotFeedbackRepository : IChatbotFeedbackRepository
    {
        private readonly ApplicationDbContext _context;

        public ChatbotFeedbackRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ChatbotFeedback> AddAsync(ChatbotFeedback interacao)
        {
            await _context.ChatbotFeedbacks.AddAsync(interacao);
            await _context.SaveChangesAsync();
            return interacao;
        }

        public async Task<ChatbotFeedback?> GetByIdAsync(int id, int usuarioId)
        {
            return await _context.ChatbotFeedbacks
                .FirstOrDefaultAsync(f => f.Id == id && f.UsuarioId == usuarioId);
        }

        public async Task UpdateAsync(ChatbotFeedback interacao)
        {
            _context.ChatbotFeedbacks.Update(interacao);
            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<ChatbotFeedback>> GetHistoricoPorUsuarioAsync(int usuarioId, int limite = 20)
        {
            return await _context.ChatbotFeedbacks
                .AsNoTracking()
                .Where(f => f.UsuarioId == usuarioId)
                .OrderByDescending(f => f.DataInteracao)
                .Take(limite)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ChatbotFeedback>> GetAvaliadosPorUsuarioAsync(int usuarioId, int limite = 30)
        {
            return await _context.ChatbotFeedbacks
                .AsNoTracking()
                .Where(f => f.UsuarioId == usuarioId && f.Util != null)
                .OrderByDescending(f => f.DataFeedback ?? f.DataInteracao)
                .Take(limite)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<ChatbotFeedback>> GetFeedbacksPositivosGlobaisAsync(int limite = 15)
        {
            return await _context.ChatbotFeedbacks
                .AsNoTracking()
                .Where(f => f.Util == true)
                .OrderByDescending(f => f.DataFeedback ?? f.DataInteracao)
                .Take(limite)
                .ToListAsync();
        }
    }
}
