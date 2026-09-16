namespace glaciar.Application.Interfaces.Services
{
    public interface IPasswordHasher
    {
        string Hash(string password);
    }
}
