# 🏔️ Glaciar E-Commerce — Artigos & Equipamentos Técnicos Outdoor

> **Painel Central do Projeto** — Plataforma de comércio eletrônico voltada a equipamentos e vestuário térmico de alta performance para montanhismo, trekking e expedições, com arquitetura limpa, core transacional robusto e suíte automatizada de testes E2E e API.

---

## 📌 1. Resumo do Projeto

O **Glaciar** é uma plataforma completa de e-commerce desenvolvida com foco em robustez transacional, experiência fluida de usuário e conformidade rigorosa com regras de negócio complexas. 

O fluxo de compras segue uma esteira orientada a estados:

```
[ Catálogo / Produto ] ➔ [ Carrinho Local ] ➔ [ Checkout Multimeios ] ➔ [ Confirmação / Pedido ]
```

### Principais Destaques Funcionais
* **Catálogo & Estoque em Tempo Real:** Validação de disponibilidade por SKU (tamanho, cor) e temporizador regressivo de reserva temporária de estoque no carrinho (janela de 15 minutos).
* **Gestão de Carrinho com Batch Diff:** Manipulação ágil em memória pelo cliente e sincronização atômica diferencial com o banco de dados antes de ir ao checkout.
* **Checkout Multimeios & Cupons:** Seleção/cadastro de múltiplos endereços com apelidos, frete dinâmico por UF, aplicação de cupons (máximo 1 promocional e múltiplos de troca) e rateio flexível do pagamento em múltiplos cartões de crédito.
* **Geração de Troco em Cupom:** Quitação integral da compra via cupons excedentes gerando automaticamente um novo cupom de troca com o valor residual.
* **Ciclo Operacional & Logística Reversa:** Máquina de estados finita blindada para aprovação/recusa de pagamentos, despacho, confirmação de entrega e protocolo completo de trocas/devoluções com reentrada física em estoque.

---

## 🎓 2. Para Que Foi Feito

O projeto foi concebido e implementado para a disciplina de **LES (Laboratório de Engenharia de Software)** da **FATEC**, sob orientação acadêmica.

### Propósitos e Objetivos de Engenharia:
1. **Modelagem de Domínio Rico (DDD):** Abandonar modelos anêmicos, encapsulando invariantes, setters privados e a máquina de estados diretamente na entidade `Pedido`.
2. **Separação Estrita de Conceitos (Clean Architecture):** Garantir independência total do núcleo de negócios em relação a frameworks web, bancos de dados e interfaces visuais.
3. **Resolução de Regras de Negócio Críticas:** Implementar regras complexas de e-commerce corporativo (piso mínimo de R$ 10,00 por cartão, exceção de resíduo pós-cupom, integridade referencial em inativações vs. exclusões físicas).
4. **Blindagem Transacional e de Concorrência:** Emprego de **Concurrency Tokens** (Optimistic Concurrency) no Entity Framework Core para evitar processamento duplicado (*double spending*), além de isolamento estrito contra vulnerabilidades IDOR.
5. **Automação Integral de Qualidade (QA / SDET):** Validação sistemática de todas as regras com testes ponta a ponta (E2E) e de contrato de API com Cypress.

---

## 🛠️ 3. Stacks Tecnológicas

| Camada | Tecnologia | Detalhes e Justificativas |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5 Semântico, Vanilla CSS | Zero dependências ou frameworks pesados; componentização nativa (Toast, Loading Overlay); máxima velocidade de carregamento e controle total sobre o DOM. |
| **Backend** | .NET 10 (C#) & ASP.NET Core Web API | **Clean Architecture** e **DDD**; separação estrita em 4 camadas (`Domain`, `Application`, `Infrastructure`, `API`); mapeamento com AutoMapper; validação fluida com Domain Exceptions. |
| **Persistência** | PostgreSQL (Supabase) & Entity Framework Core | Migrações versionadas, transações atômicas com **Unit of Work**, `ExecuteUpdate` para concorrência de estoque e `AsSplitQuery` para leitura eficiente de agregados. |
| **Contêineres** | Docker & Docker Compose | Ambientes reprodutíveis e isolados; API conteinerizada em imagem .NET 10 SDK/ASP.NET e Frontend servido via servidor Nginx Alpine ultraleve. |
| **Qualidade & QA** | Cypress 16+ (JavaScript) | Suíte automatizada cobrindo jornadas E2E completas no navegador e testes diretos de contrato HTTP (`cy.request()`). |

---

## 📁 4. Divisões do Projeto

A organização de diretórios do repositório reflete a separação de responsabilidades da aplicação:

```
glaciar/
├── frontend/                   # Interface web do cliente e do administrador
│   ├── admin/                  # Painéis operacionais (pedidos, clientes, devoluções)
│   ├── css/                    # Folhas de estilo modulares e Design System
│   ├── js/                     # Componentes nativos, carrinho, checkout e serviços UI
│   ├── Dockerfile              # Imagem Nginx Alpine para servir o frontend
│   └── *.html                  # Telas públicas (index, catálogo, carrinho, checkout, login)
│
├── src/                        # Solução Backend em .NET 10 (Clean Architecture)
│   ├── glaciar.Domain/         # Entidades puras, agregados, regras de cupons e máquina de estados
│   ├── glaciar.Application/    # Casos de uso, DTOs, interfaces de serviços e regras de negócio
│   ├── glaciar.Infrastructure/ # EF Core DbContext, mapeamentos, repositórios e serviços de dados
│   ├── glaciar.API/            # Controllers REST, middlewares de erro, DI e Program.cs
│   └── Dockerfile              # Build multi-stage e runtime da API .NET
│
├── tests/                      # Automação de testes de qualidade (Cypress)
│   ├── cypress/e2e/            # Especificações de teste organizadas por domínio/módulo
│   ├── cypress.config.js       # Configurações do Cypress (baseUrls, timeouts, projetos)
│   └── package.json            # Dependências e scripts de execução de teste
│
├── docker-compose.yml          # Orquestração local dos serviços API e Frontend
├── .env                        # Variáveis de ambiente (string de conexão do PostgreSQL)
└── *.md                        # Documentações técnicas especializadas da aplicação
```

---

## 🚀 5. Como Rodar o Projeto (Docker & Testes)

### 5.1 Rodando com Docker Compose

Toda a infraestrutura (API .NET e Frontend Nginx) pode ser instanciada rapidamente com o Docker Compose:

#### 1. Configurar o arquivo `.env`
Certifique-se de que o arquivo `.env` existe na raiz do projeto com a string de conexão do Supabase/PostgreSQL configurada:
```env
SUPABASE_CONNECTION=Host=aws-1-sa-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.izgsumhbskqzuowxttyx;Password=nIlBJHhLf1033tKb;Pooling=false;CommandTimeout=1000
```

#### 2. Subir os Contêineres
Na raiz do projeto, execute:
```bash
# Construir as imagens e iniciar os serviços
docker compose up --build

# Ou iniciar em segundo plano (modo detached):
docker compose up --build -d
```

#### 3. Acessar as Aplicações
* 🌐 **Frontend (Loja & Painel Admin):** [http://localhost:5500](http://localhost:5500)
* ⚙️ **Backend API (.NET Core):** [http://localhost:5205/api](http://localhost:5205/api)

#### 4. Encerrar a Execução
```bash
docker compose down
```

---

### 5.2 Instalando e Executando os Testes (Cypress)

A suíte de testes de ponta a ponta e contrato HTTP é gerenciada na pasta `tests/`.

#### 1. Instalar as dependências do Cypress
```bash
cd tests
npm install
```

#### 2. Executar toda a suíte completa no terminal (Headless)
```bash
# Executa todos os testes E2E e de API
npm test

# Ou diretamente pelo npx:
npx cypress run
```

#### 3. Executar suítes específicas por módulo
```bash
# Executar apenas testes de Checkout e Vendas
npx cypress run --spec "cypress/e2e/checkout-vendas-clientes/**"

# Executar apenas testes de CRUD de Clientes
npx cypress run --spec "cypress/e2e/crud-clientes/**"

# Executar apenas testes do Ciclo Logístico, Trocas e Estados
npx cypress run --spec "cypress/e2e/troca-estados/**,cypress/e2e/devolucoes-trocas/**"
```

#### 4. Abrir no modo interativo (com interface visual)
```bash
npx cypress open
# ou: npm run cypress:open
```

---

## 📚 6. Central de Documentação Técnica

Para aprofundar nos detalhes de cada módulo, consulte as documentações dedicadas:

| Tópico | Documento | Conteúdo Detalhado |
| :--- | :--- | :--- |
| 🏗️ **Arquitetura de Software** | [`ARQUITETURA.md`](./ARQUITETURA.md) | Organização em **Clean Architecture**, DDD, divisão e dependências entre camadas (.NET 10), persistência com EF Core e arquitetura de Front-end (Batch Diff e UI Services). |
| ⚙️ **Regras de Negócio e Checkout** | [`REGRAS_CHECKOUT.md`](./REGRAS_CHECKOUT.md) | Regras de pagamento multimeios (**RN0034**), flexibilização de resíduo (**RN0035**), limite de cupom promocional (**RN0033**), troco em cupom de troca (**RN0036**) e diagrama de sequência. |
| 🔁 **Máquina de Estados e Logística** | [`MAQUINA_DE_ESTADOS.md`](./MAQUINA_DE_ESTADOS.md) | Ciclo de vida completo do pedido, diagrama visual de estados, matriz de transições e atores autorizados (Admin vs. Cliente), logística reversa e pilares de blindagem contra burlas. |
| 📡 **Contratos de API** | [`CONTRATOS_API.md`](./CONTRATOS_API.md) | Especificação das rotas REST, headers de contexto (`X-Usuario-Id`), exemplos completos de payloads JSON de envio e retorno, e catálogo de códigos de erro HTTP. |
| 🧪 **Catálogo de Casos de Teste** | [`CASOS_DE_TESTE.md`](./CASOS_DE_TESTE.md) | Inventário exaustivo de todos os testes automatizados Cypress método a método, nomes dos testes (`it`), descritivo funcional, requisitos cobertos (DRS) e guia de execução. |
| 📋 **Documento de Requisitos** | [`documento_de_requisitos.md`](./documento_de_requisitos.md) | Especificação original dos Requisitos Funcionais (RFs), Regras de Negócio (RNs) e Requisitos Não Funcionais (RNFs) da disciplina. |

---

## 👨‍💻 Autoria e Informações Acadêmicas
Projeto desenvolvido para a disciplina de **LES (Laboratório de Engenharia de Software)** — **FATEC**.
