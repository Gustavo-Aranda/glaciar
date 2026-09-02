# Arquitetura de API Web com ASP.NET Core: Camadas Domain, Application e Infrastructure
Este documento descreve a organização arquitetural do projeto baseado nos princípios de **Clean Architecture** (Arquitetura Limpa) e **Domain-Driven Design (DDD)**. O objetivo principal desta estrutura é a **Separação de Conceitos**, garantindo que as regras de negócio centrais permaneçam completamente independentes de bancos de dados, frameworks externos e interfaces de usuário.

---

## 🏗️ Estrutura de Dependências do Projeto

Nesta arquitetura, **as dependências apontam para dentro**. A lógica de negócios principal (Domain) não conhece nada sobre as camadas externas, frameworks ou bancos de dados.


* **Domain**: Totalmente independente (Zero referências externas).
* **Application**: Referencia apenas a camada **Domain**.
* **Infrastructure**: Referencia a camada **Application** (para implementar suas interfaces/contratos).
* **Presentation (API)**: Referencia **Application** (e referencia **Infrastructure** exclusivamente para configurar a Injeção de Dependência no início da aplicação).

---

## 🗂️ Divisão Detalhada das Camadas

| Camada | Responsabilidade Principal | Estrutura de Pastas Comum / Conteúdo |
| :--- | :--- | :--- |
| **Domain** | Contém os modelos de negócios da empresa, regras e estados centrais. Representa o "coração" do sistema. | <ul><li>`/Entities` (ex: `Product.cs`, `User.cs`)</li><li>`/ValueObjects` (ex: `Address.cs`, `Money.cs`)</li><li>`/Exceptions` (Exceções de negócio)</li><li>`/Interfaces` (Contratos de repositórios, ex: `IProductRepository`)</li></ul> |
| **Application** | Define os "Casos de Uso" (o que o sistema faz) e coordena as ações do domínio. Depende fortemente de abstrações. | <ul><li>`/Features` ou `/UseCases` (frequentemente organizados com [MediatR](https://milanjovanovic.tech) Commands/Queries)</li><li>`/DTOs` (Data Transfer Objects)</li><li>`/Interfaces` (Serviços da aplicação, ex: `IEmailService`)</li><li>`/Validators` (Regras de validação do [FluentValidation](https://milanjovanovic.tech))</li></ul> |
| **Infrastructure** | Implementa as interfaces definidas nas camadas inferiores, lidando com detalhes técnicos como bancos de dados ou APIs de terceiros. | <ul><li>`/Persistence` (EF Core `DbContext`, Migrações)</li><li>`/Repositories` (Código concreto de acesso a dados)</li><li>`/Services` (Integrações concretas como `SendGridEmailSender`)</li></ul> |
| **Presentation (API)** | Funciona como o ponto de entrada do sistema. Gerencia requisições HTTP, autenticação, middlewares e formatação de respostas. | <ul><li>`/Controllers` ou Endpoints de Minimal APIs</li><li>`/Middleware` (Interceptadores globais de erros, logs)</li><li>`Program.cs` (Raiz de composição onde o DI é configurado)</li></ul> |

---

## 🔄 Exemplo de Fluxo de Código: Criação de um Produto

Para entender como essas camadas se comunicam, veja como uma requisição trafega pelo sistema:

### 1. Presentation Layer (API Endpoint)
A API recebe uma requisição HTTP POST. Ela traduz o JSON em um comando DTO e o envia para a camada de aplicação usando o padrão Mediator.

```csharp
[HttpPost]
public async Task<IActionResult> Create(CreateProductCommand command)
{
    var productId = await _mediator.Send(command);
    return CreatedAtAction(nameof(GetById), new { id = productId }, null);
}
```

### 2. Application Layer (Execução do Caso de Uso)
O manipulador do comando (Handler) coordena a tarefa. Ele busca dados se necessário através de interfaces abstratas, invoca as regras de negócio na entidade do Domínio e salva as alterações.

```csharp
public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Guid>
{
    private readonly IProductRepository _productRepository; // Interface definida no Domínio/Aplicação

    public async Task<Guid> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        // Executa as regras de domínio através do construtor da Entidade
        var product = new Product(Guid.NewGuid(), request.Name, request.Price); 
        
        await _productRepository.AddAsync(product);
        return product.Id;
    }
}
```

### 3. Domain Layer (Execução das Regras de Negócio)
A entidade valida seu próprio estado. Ela garante que nenhuma regra de negócio seja violada ao tentar criar um objeto inválido.

```csharp
public class Product
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public decimal Price { get; private set; }

    public Product(Guid id, string name, decimal price)
    {
        if (price < 0) throw new BusinessException("O preço não pode ser negativo.");
        Id = id;
        Name = name;
        Price = price;
    }
}
```

### 4. Infrastructure Layer (Persistência de Dados)
Invisível para as camadas de Aplicação e Domínio em tempo de compilação, esta camada lida com as operações de banco de dados de baixo nível usando o Entity Framework Core.

```csharp
public class ProductRepository : IProductRepository
{
    private readonly ApplicationDbContext _context;

    public ProductRepository(ApplicationDbContext context) => _context = context;

    public async Task AddAsync(Product product)
    {
        await _context.Products.AddAsync(product);
        await _context.SaveChangesAsync();
    }
}