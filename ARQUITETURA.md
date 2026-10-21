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
```

---

## 🏛️ Caso de Estudo Real do Projeto Glaciar: Máquina de Estados Operacionais

Para o módulo de gestão pós-checkout e devoluções do **Glaciar**, foi adotado um padrão de **Máquina de Estados Finita e Declarativa (State Machine)** associado ao conceito de **Agregados Ricos** do DDD.

### 1. Separação de Responsabilidades (SOLID / Clean Architecture)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ Presentation / API ]                                                                 │
│  - Recebe PATCH /api/admin/pedidos/{id}/status ou PATCH /api/pedidos/{id}/status       │
│  - Extrai identidade e ator (Admin ou Cliente)                                         │
│  - Mapeia exceções: 400 (DomainValidation), 404 (NotFound), 409 (Concurrency)          │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ chama
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│ [ Application Layer: PedidoStatusService ]                                            │
│  - Inicia transação com UnitOfWork                                                     │
│  - Carrega o agregado Pedido rastreado via IPedidoRepository                          │
│  - Invoca pedido.AlterarStatus(novoStatus, ator)                                       │
│  - Persiste via pedidoRepository.UpdateAsync(pedido)                                   │
│  - Executa efeitos colaterais de I/O decididos pelo domínio (estoque / novo cupom)     │
│  - Comita a transação e mapeia o DTO de retorno                                        │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ orquestra
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│ [ Domain Layer: Pedido (Aggregate Root) + PedidoMaquinaEstados ]                       │
│  - Pedido.Status possui 'private set' (proibindo mutação indevida)                     │
│  - Valida transição estrita na matriz (StatusAtual, ProximoStatus, Ator)               │
│  - Atualiza coleções filhas do agregado (Pagamentos, Entregas)                         │
│  - Retorna ResultadoTransicaoPedido com instruções de I/O para a Application           │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ persiste
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│ [ Infrastructure Layer: PedidoRepository + EF Core ]                                  │
│  - Mapeamento com HasConversion<string>() e IsConcurrencyToken()                       │
│  - Executa UPDATE ... WHERE Id = @id AND Status = @statusLido (Compare-And-Set)        │
│  - Captura DbUpdateConcurrencyException e traduz para ConflitoDeConcorrenciaException  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Por que esse padrão é superior?
1. **Regra de Negócio 100% no Domínio (DDD Puro):** Nenhum Controller ou Service possui `if (status == ...)` espalhado. A matriz declarativa de transições é a **única fonte da verdade** para o backend e alimenta dinamicamente o frontend.
2. **Impossível Burlar Etapas:** Um pedido em `EmProcessamento` nunca pode ir para `EmTransporte` sem antes ter passado por `PagamentoRealizado`.
3. **Imune a Race Conditions:** O status é um **Concurrency Token**, transformando a atualização em um *Compare-And-Set* atômico no banco de dados.
4. **Isolamento de I/O:** O domínio não depende de repositórios nem de banco; ele apenas decide *quais* efeitos devem ocorrer (`ResultadoTransicaoPedido`) e a Application executa o I/O de forma segura e transacional.

---

## 💻 Arquitetura de Front-end (Vanilla Modular)

O front-end adota Vanilla JavaScript modular (ES6+), HTML5 e Vanilla CSS com zero dependências em runtime, garantindo máxima performance e componentização nativa.

### 1. Gestão de Estado Local com Sincronização em Lote (Batch Diff) no Carrinho

Para evitar chamadas desnecessárias de rede a cada clique do usuário, o carrinho adota o padrão de gestão em memória:
* **Experiência do Usuário (UX Fluida):** Ações de quantidade (`+` e `-`) alteram instantaneamente o estado em memória (`estado.itens`), recalculando subtotais, estoque limite e valores na tela sem delay de rede ou oscilação de layout (*layout thrashing*).
* **Snapshot de Comparação:** A aplicação retém o snapshot oficial do servidor (`estado.quantidadesOriginais`). Quando o usuário clica em **"Continuar para o checkout"**, a função `montarPayloadAlteracoes()` gera um payload diferencial contendo apenas os itens alterados ou removidos (`quantidade: 0`).
* **Sincronização Atômica (`PUT /api/carrinho/itens`):** Uma única chamada HTTP sincroniza todas as modificações no banco antes de navegar para `checkout.html`.

```javascript
// Exemplo do cálculo de diff no carrinho (carrinho.js)
function montarPayloadAlteracoes() {
    const atuais = new Map(estado.itens.map(({ id, quantidade }) => [id, quantidade]));
    return [...estado.quantidadesOriginais]
        .map(([itemId, original]) => ({ itemId, quantidade: atuais.get(itemId) ?? 0, original }))
        .filter(({ quantidade, original }) => quantidade !== original)
        .map(({ itemId, quantidade }) => ({ itemId, quantidade }));
}
```

### 2. Serviços Globais de UI/UX (Singletons)

* **`LoadingService`:** Gerencia um overlay bloqueante (`.loading-overlay`) com spinner estilizado e backdrop blur durante operações assíncronas críticas, prevenindo múltiplos disparos acidentais (*double submission*).
* **`NotificationService` (`window.Toast`):** Sistema reativo e categorizado de alertas flutuantes (`showError`, `showSuccess`, `showInfo`) posicionado em container dedicado, com autodismiss e animações CSS suaves.

---

## 🔗 Documentos Técnicos Relacionados
* [Regras de Negócio e Checkout](./REGRAS_CHECKOUT.md)
* [Máquina de Estados e Ciclo de Vida do Pedido](./MAQUINA_DE_ESTADOS.md)
* [Contratos de API](./CONTRATOS_API.md)
* [Catálogo de Testes Automatizados](./CASOS_DE_TESTE.md)