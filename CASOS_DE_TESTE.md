# 🧪 Catálogo Oficial de Casos de Teste Automatizados (Cypress E2E & API)
**Glaciar E-Commerce — Artigos e Equipamentos Técnicos Outdoor & Trekking**  
*Documento Técnico de Engenharia de Qualidade de Software (QA / SDET)*

---

## 📌 1. Visão Geral e Estrutura da Suíte de Testes

A suíte de automação de testes do **Glaciar** foi desenvolvida sobre o framework **Cypress 16+** em JavaScript, estruturada para assegurar 100% de conformidade com as Regras de Negócio (RNs) e Requisitos Funcionais (RFs) do Documento de Requisitos de Software (DRS), além de cobrir com rigor as entregas acadêmicas do projeto:

* **Módulo A:** CRUD Completo de Clientes (Manutenção, Inativação vs. Exclusão, Estruturas Vinculadas e Validações).
* **Módulo B:** Criação do Pedido (Gestão do Carrinho, Checkout com Dados Salvos/Novos, Cálculo Dinâmico de Frete e Regras Críticas de Pagamento).
* **Módulo C:** Gerenciar Vendas (Ciclo Logístico, Estoque Físico vs. Desbloqueio e Logística Reversa Completa de Trocas).

### 📁 Estrutura de Diretórios (`tests/cypress/e2e/`)
```
tests/cypress/e2e/
├── crud-clientes/                 # 12 specs: Cadastro, Edição, Consulta com Filtros, Inativação, Endereços, Cartões, Login
├── checkout-vendas-clientes/      # 8 specs: Carrinho, Checkout Simples, Completo, Multicartões, Pagamento Misto, Troco em Cupom
├── devolucoes-trocas/             # 3 specs: Solicitação de Troca (UI), Acompanhamento Reverso, Notificações
├── expiracao-carrinho/            # 2 specs: Temporizador de Reserva (15min / 5min) e Timeout com Liberação de Estoque
├── troca-estados/                 # 2 specs: Painel de Pedidos Admin (Ciclo Logístico e Estoque) e Contrato da Máquina de Estados
└── validacao-atores/              # 1 spec: Matriz de Permissão Cliente vs. Administrador e Isolamento IDOR
```

---

## 📋 2. Catálogo Detalhado de Casos de Teste

Abaixo está o inventário completo método a método de cada especificação (`.cy.js`), detalhando o **Nome do Teste**, o **O que faz / Comportamento Validado** e o **Requisito Coberto**.

---

### 👤 2.1 Módulo: CRUD de Clientes (`crud-clientes/`)

#### 📄 [`cadastro-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/cadastro-cliente.cy.js)
Validação da jornada do cliente ao criar conta pelo formulário web (`cadastro.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `exibe erro quando o CPF informado e invalido` | Preenche o formulário com CPF matematicamente inválido (`11111111111`) e valida a mensagem preventiva na interface bloqueando o envio. | **RF0021 / RN0026** |
| `cadastra um cliente com os dados normalizados` | Preenche nome e e-mail em caixa mista/alta e valida que a aplicação normaliza os dados (capitalização e e-mail minúsculo) antes de disparar `POST /api/conta/registrar` com sucesso. | **RF0021 / RN0026** |
| `exibe erro ao tentar cadastrar sem preencher os dados obrigatorios` | Tenta submeter o formulário sem preenchimento e valida que nenhuma chamada de rede é disparada, exibindo aviso de campos obrigatórios. | **RF0021 / RN0026** |
| `exibe erro ao cadastrar um CPF ja cadastrado` | Simula resposta HTTP 400 da API para duplicidade de CPF e valida exibição do alerta `"CPF já cadastrado."`. | **RF0021 / RN0026** |
| `exibe erro ao cadastrar um email ja cadastrado` | Simula resposta HTTP 400 da API para e-mail já existente na base e valida exibição do alerta `"Email já cadastrado."`. | **RF0021 / RN0026** |

#### 📄 [`cadastro-cliente-admin.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/cadastro-cliente-admin.cy.js)
Cadastro de clientes e administradores operacionais através do modal do painel administrativo (`admin/clientes.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `cria um cliente com telefone normalizado` | Abre o modal de cadastro administrativo, preenche dados com telefone válido e perfil selecionado (`CLI`), validando o envio a `POST /api/conta/admin/registrar`. | **RF0021 / RN0026** |
| `recusa cadastro com telefone inválido` | Submete formulário com telefone incompleto (`119`) e valida exibição de notificação exigindo telefone com DDD válido. | **RF0021 / RN0026** |

#### 📄 [`consulta-clientes-admin.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/consulta-clientes-admin.cy.js)
Consulta parametrizada de clientes com filtros isolados e combinados pelo painel administrativo.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `lista todos os clientes inicialmente no painel administrativo` | Carrega `admin/clientes.html` com mock de clientes e valida a renderização inicial dos cards no container `#lista-clientes-container`. | **RF0024** |
| `filtra clientes de forma isolada por Nome (RF0024)` | Digita `"Carlos"` na barra de busca e valida que apenas o cliente com o nome correspondente permanece visível. | **RF0024** |
| `filtra clientes de forma isolada por CPF (RF0024)` | Informa apenas os números do CPF de um cliente específico e valida que o filtro localiza o registro com precisão. | **RF0024** |
| `filtra clientes de forma isolada por Email (RF0024)` | Informa o endereço de e-mail exato e valida o isolamento do cliente correspondente. | **RF0024** |
| `filtra clientes combinando múltiplos termos (nome e sobrenome) (RF0024)` | Realiza busca combinada por nome completo (`"Maria Silva"`), validando a intersecção de múltiplos critérios. | **RF0024** |
| `exibe mensagem apropriada quando a consulta não retorna resultados` | Digita termo inexistente e valida a exibição da mensagem amigável `"Nenhum cliente atende aos critérios da busca."`. | **RF0024** |

#### 📄 [`editar-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/editar-cliente.cy.js)
Alteração de dados cadastrais e alteração exclusiva de senha pelo próprio cliente (`editar-perfil.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `altera os dados cadastrais do cliente` | Modifica nome, e-mail e telefone no perfil e valida que `PUT /api/conta/42/perfil` é disparado com os novos dados. | **RF0022** |
| `Alteração apenas da senha (C)` | Preenche unicamente o campo de nova senha sem alterar os demais dados cadastrais, validando a atualização independente de credencial. | **RF0028** |
| `exibe erro ao tentar salvar sem preencher os dados obrigatorios` | Limpa os campos obrigatórios e submete o formulário, validando o bloqueio de requisição e alerta em tela. | **RF0022** |
| `exibe erro ao trocar o email por outro ja cadastrado` | Informa e-mail pertencente a outra conta e valida o tratamento do HTTP 400 com mensagem explicativa. | **RF0022** |

#### 📄 [`editar-cliente-admin.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/editar-cliente-admin.cy.js)
Edição e manutenção de clientes através do modal administrativo (`admin/clientes.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `altera os dados cadastrais do cliente` | Abre o modal de edição de cliente no painel admin, altera campos cadastrais e valida payload em `PUT /api/conta/42`. | **RF0022** |
| `informa erro ao tentar salvar sem preencher os dados` | Submete edição com dados em branco no modal e valida notificação de obrigatoriedade. | **RF0022** |
| `informa erro ao trocar o CPF por outro ja cadastrado` | Informa CPF duplicado no modal admin e valida mensagem de rejeição. | **RF0022** |
| `informa erro ao trocar o email por outro ja cadastrado` | Informa e-mail duplicado no modal admin e valida mensagem de conflito. | **RF0022** |
| `informa erro ao tentar salvar um CPF invalido` | Informa CPF com dígitos verificadores inválidos e valida rejeição preventiva no modal. | **RF0022** |

#### 📄 [`inativa-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/inativa-cliente.cy.js)
Regras de inativação de conta (pelo cliente e pelo admin) e validação estrita de preservação do histórico de transações.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `recusa o login de uma conta de cliente inativada` | Tenta efetuar login com credenciais de usuário inativo (`ativo: false`) e valida recusa com HTTP 401 e mensagem `"Esta conta está inativada"`. | **RF0023** |
| `inativa o cadastro do cliente e volta para o login` | Cliente aciona o botão `"Inativar Conta"` em seu perfil, confirma o modal, valida envio de `PATCH /api/conta/42/status` (`{ ativo: false }`) e redirecionamento. | **RF0023** |
| `Inativar cadastro de Cliente (A)` | Administrador aciona o botão de status em `admin/clientes.html`, confirma a inativação e valida atualização da lista. | **RF0023** |
| `preserva histórico de transações e integridade referencial após inativação (Inativação vs Exclusão)` | **Inativação vs. Exclusão:** Valida que, após uma conta ser inativada, todo o seu histórico de pedidos, transações e produtos permanece perfeitamente consultável em `pedidos.html` sem perda de integridade. | **RF0023 / RF0025** |

#### 📄 [`cadastro-endereco-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/cadastro-endereco-cliente.cy.js)
Gestão de endereços de entrega com frases curtas/apelidos identificadores (`enderecos.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `cadastra um novo endereco para o cliente` | Preenche formulário com CEP, logradouro, número, bairro, cidade, estado e apelido identificador (`"Casa"`), validando persistência via `POST /api/enderecos`. | **RF0026 / RN0022 / RN0023** |
| `recusa cadastro sem preencher os campos obrigatórios` | Tenta submeter formulário de endereço vazio e valida aviso de obrigatoriedade. | **RN0023** |
| `associa múltiplos endereços de entrega com frase curta/apelido identificador (RF0026)` | Cadastra um segundo endereço de entrega com apelido descritivo (`"Base Camp Montanha"`), validando a capacidade de associar múltiplos endereços ao perfil. | **RF0026** |

#### 📄 [`cadastro-cartoes-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/cadastro-cartoes-cliente.cy.js)
Gestão da carteira de cartões de crédito do cliente (`pagamentos.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `associa diversos cartões ao cliente e mantém um cartão preferencial` | Cadastra primeiro cartão com flag de preferencial ativa (`padrao: true`) e um segundo cartão secundário (`padrao: false`), validando que a carteira retém múltiplos itens e exatamente um preferencial. | **RF0027** |
| `exibe erro ao cadastrar cartão com número inválido` | Submete cartão com numeração inválida e valida feedback de erro correspondente. | **RN0024** |

#### 📄 [`login-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/login-cliente.cy.js)
Autenticação de usuários parametrizada por papéis (Cliente Comum vs. Administrador).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `informa quando as credenciais sao invalidas` | Tenta login com senha incorreta e valida alerta de credenciais inválidas. | **Autenticação** |
| `informa erro ao tentar entrar sem preencher os dados` | Submete login em branco e valida bloqueio sem disparo de requisição. | **Autenticação** |
| `autentica e redireciona Cliente para a rota correta` | Valida login de Cliente comum (`tipoUsuario: 0`), normalização de e-mail e redirecionamento para `conta.html?id=42`. | **Autenticação / Rotas** |
| `autentica e redireciona Administrador para a rota correta` | Valida login de Administrador (`tipoUsuario: 1`) e redirecionamento obrigatório para o painel de pedidos (`admin/pedidos.html`). | **Autenticação / Rotas** |

#### 📄 [`crud-clientes-api.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/crud-clientes-api.cy.js)
Testes de contrato e ciclo de vida HTTP direto (`cy.request()`) no endpoint `/api/conta`.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `cria, consulta, altera e remove um cliente` | Executa fluxo completo de criação (201), consulta individual (200), alteração cadastral (200) e listagem via requisições HTTP puras. | **RF0021 a RF0024** |
| `rejeita cliente com CPF inválido` | Dispara `POST /api/conta/registrar` com CPF repetido e valida resposta HTTP 400. | **RN0026** |
| `rejeita cliente com e-mail já cadastrado` | Tenta registrar duas vezes o mesmo e-mail e valida rejeição HTTP 400 por duplicidade. | **RN0026** |
| `inativa cliente preservando integridade referencial em vez de exclusão física (Inativação vs Exclusão)` | Cria um cliente, executa `PATCH /api/conta/{id}/status` com `{ ativo: false }`, valida que o registro permanece consultável via GET com `ativo: false` e que novas tentativas de login retornam 401. | **RF0023 / Inativação** |

#### 📄 [`crud-enderecos-api.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/crud-enderecos-api.cy.js)
Contrato e validações de dados de endereços via API direta (`/api/enderecos`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `cadastra, consulta, altera e remove endereço do cliente` | Ciclo completo de criação (201), consulta por cliente (200), atualização de logradouro (204) e exclusão do vínculo (204). | **RF0026 / RN0023** |
| `rejeita endereço com CEP em branco` | Valida que a API recusa com HTTP 400 payload de endereço sem CEP. | **RN0023** |
| `rejeita endereço sem número` | Valida que a API recusa com HTTP 400 payload de endereço sem numeração. | **RN0023** |

#### 📄 [`crud-cartoes-api.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/crud-clientes/crud-cartoes-api.cy.js)
Contrato e segurança de cartões de crédito via API direta (`/api/cartoes`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `cria e consulta dois cartões reais, com um preferencial` | Registra dois cartões com segurança (sem vazar CVV ou número completo na resposta), validando persistência de apenas 1 com `padrao: true`. | **RF0027** |
| `rejeita cartão com número inválido` | Valida recusa com HTTP 400 de cartão com algoritmo de Luhn inválido. | **RN0024** |
| `rejeita cartão com CVV inválido` | Valida recusa com HTTP 400 de cartão com CVV de tamanho insuficiente. | **RN0024** |

---

### 🛒 2.2 Módulo: Checkout e Vendas (`checkout-vendas-clientes/`)

#### 📄 [`gestao-carrinho-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-vendas-clientes/gestao-carrinho-cliente.cy.js)
Gestão de estado local, recálculo reativo e sincronização em lote (Batch Diff) no carrinho (`carrinho.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `lista múltiplos itens com seus preços e quantidades` | Carrega o carrinho com múltiplos itens térmicos Glaciar e valida subtotais e total inicial na interface. | **RF0031** |
| `incrementa e decrementa quantidades recalculando visualmente os subtotais e total` | Clica em `+` e `-`, validando que os subtotais e o total geral recalculam instantaneamente sem oscilação de layout ou chamadas prematuras de rede. | **RF0032** |
| `desabilita botão de decrementar quando a quantidade for 1 (limite mínimo)` | Valida que o botão `-` é desabilitado quando a quantidade atinge 1 unidade, impedindo remoção acidental por decremento. | **RF0032** |
| `desabilita botão de incrementar ao atingir o estoque máximo disponível` | Incrementa até o limite disponível em estoque (`5 unidades`) e valida o bloqueio estrito do botão `+`. | **RN0031** |
| `atualiza o contador total de peças no cabeçalho ao aumentar e diminuir múltiplos itens` | Valida a consistência do badge de total de peças no cabeçalho do carrinho ao manipular múltiplos produtos. | **RF0031** |
| `sincroniza as alterações locais via PUT na API ao prosseguir para o checkout` | Avança para o checkout e valida o disparo de um único `PUT /api/carrinho/itens` com o lote diferencial das quantidades alteradas. | **RF0031 / RF0033** |

#### 📄 [`checkout-simples-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-vendas-clientes/checkout-simples-cliente.cy.js)
Checkout com dados prévios, cálculo dinâmico de frete e status inicial `EmProcessamento` (`checkout.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `carrega endereço principal e cartão vinculado automaticamente` | Valida o pré-preenchimento automático do endereço padrão e do cartão preferencial do cliente ao carregar a tela de checkout. | **RF0035 / RF0036** |
| `finaliza a compra com sucesso e registra o status EmProcessamento` | Finaliza a compra simples com dados padrão e valida que o pedido é registrado obrigatoriamente no status **`EmProcessamento`**. | **RF0038** |
| `exibe o pedido com status Em Processamento no histórico de Meus Pedidos` | Navega para `pedidos.html` e valida que a compra recente consta com badge de alerta e status `"Em Processamento"`. | **RF0025 / RF0038** |
| `recalcula o frete dinamicamente com base no endereço de entrega selecionado (RF0034)` | Altera o estado de entrega de destino para `"RJ"` e valida que a API recalcula o frete (`R$ 35,00`), atualizando reativamente o resumo de valores. | **RF0034** |

#### 📄 [`checkout-completo-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-vendas-clientes/checkout-completo-cliente.cy.js)
Checkout para clientes sem dados salvos ou que optam por cadastrar novo endereço e cartão durante a compra.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `valida campos obrigatórios ao tentar submeter endereço incompleto (Unhappy Path)` | Tenta submeter o checkout com novo endereço em branco e valida bloqueio com toast de alerta. | **RF0035 / RN0023** |
| `cadastra novo endereço e novo cartão marcando para salvar no perfil (Happy Path)` | Preenche novo endereço e novo cartão marcando os checkboxes `"Salvar no perfil"`, validando envio no payload (`salvarNoPerfil: true`) e finalização em `EmProcessamento`. | **RF0035 / RF0036** |

#### 📄 [`checkout-multiplos-cartoes-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-multiplos-cartoes-cliente.cy.js)
Validação parametrizada das regras de valores-limite no pagamento com múltiplos cartões (**RN0034**).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `RN0034: rejeita cartão 2 com valor abaixo do piso (R$ 5,00 < R$ 10,00)` | Divide R$ 50,00 em R$ 45,00 e R$ 5,00; valida bloqueio de envio e toast de piso mínimo de R$ 10,00. | **RN0034** |
| `RN0034: rejeita cartão 1 com valor de borda inválido (R$ 9,99 < R$ 10,00)` | Divide em R$ 9,99 e R$ 40,01; valida que o valor imediatamente abaixo do piso é rigorosamente bloqueado. | **RN0034** |
| `RN0034: aprova pagamento exatamente no piso mínimo (R$ 10,00 e R$ 40,00)` | Divide a cobrança atribuindo exatamente R$ 10,00 a um cartão e R$ 40,00 ao outro; valida liberação e finalização. | **RN0034** |
| `RN0034: aprova pagamento com divisão equilibrada (R$ 30,00 e R$ 20,00)` | Divide o valor em duas parcelas superiores a R$ 10,00; valida sucesso da transação. | **RN0034** |

#### 📄 [`checkout-pagamento-misto-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-pagamento-misto-cliente.cy.js)
Pagamento misto com cupons e flexibilização da regra de piso no cartão de crédito (**RN0035**).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `aplica cupom promocional e recalcula o saldo devedor reativamente` | Aplica cupom de R$ 100,00 sobre compra de R$ 105,00; valida recálculo do resumo e ajuste automático da cobrança do cartão para R$ 5,00. | **RN0033** |
| `permite cartão com valor inferior a R$ 10,00 quando houver cupom cobrindo o restante da compra (RN0035)` | **RN0035:** Valida a exceção à RN0034: autoriza a cobrança de saldo residual inferior a R$ 10,00 (`R$ 5,00`) no cartão porque o saldo foi abatido por cupom. | **RN0035** |

#### 📄 [`checkout-troco-cupom-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-troco-cupom-cliente.cy.js)
Regras de troco em cupom (**RN0036**), bloqueio de cupons excedentes e unicidade de cupom promocional (**RN0033**).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `zera o saldo a pagar quando o cupom de troca cobre 100% da compra sem exigir cartão` | Aplica cupom de troca de R$ 150,00 sobre compra de R$ 100,00 e valida que o saldo a pagar vai para R$ 0,00 sem exigir cartão de crédito. | **RN0036** |
| `finaliza o pedido com sucesso e gera um novo cupom de troca com a diferença de troco (RN0036)` | Finaliza pedido quitado com cupom de troca excedente e valida a mensagem de sucesso exibindo o código e valor exato do **novo cupom de troca gerado** (`R$ 50,00`). | **RN0036** |
| `rejeita a aplicação de um segundo cupom promocional na mesma compra permitindo apenas múltiplos cupons de troca (RN0033)` | **RN0033:** Aplica um cupom promocional e tenta aplicar um segundo cupom promocional; valida bloqueio e mensagem explicativa de limite de 1 cupom promocional. | **RN0033** |
| `bloqueia inserção desnecessária de cupons quando o saldo da compra já foi 100% quitado (RN0036)` | **RN0036:** Tenta inserir um cupom de troca adicional quando o valor total da compra já foi 100% liquidado; valida rejeição da API para evitar excesso indevido de troco. | **RN0036** |

#### 📄 [`checkout-dois-cartoes-cupom-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-dois-cartoes-cupom-cliente.cy.js)
Cenários complexos combinando aplicação de cupom com partição em múltiplos cartões de crédito.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `permite realizar a compra dividindo o saldo entre dois cartões vinculados após aplicar cupom (Happy Path)` | Aplica cupom de R$ 50,00 e distribui o saldo devedor restante (`R$ 100,00`) entre dois cartões vinculados (`R$ 60,00` e `R$ 40,00`), finalizando com sucesso. | **RN0033 / RN0034** |
| `permite pagar com 1 cartão vinculado e 1 novo cartão cadastrado na hora mais o cupom (Happy Path)` | Liquida saldo pós-cupom dividindo entre um cartão já salvo no perfil e um novo cartão informado no ato. | **RF0036 / RN0034** |
| `bloqueia pagamento quando a soma dos dois cartões for inferior ao saldo devedor restante após o cupom (Unhappy Path)` | Aplica cupom e informa valores nos cartões cuja soma é menor que o saldo devedor; valida bloqueio com aviso de valor insuficiente. | **RN0034** |

#### 📄 [`checkout-vendas-api.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/checkout-vendas-api.cy.js)
Testes diretos de API validando as regras do core transacional de checkout (`/api/checkout/finalizar`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `rejeita requisições sem o header obrigatório X-Usuario-Id no checkout (HTTP 400)` | Dispara GET em `/checkout/contexto` sem header de autenticação e valida recusa com HTTP 400. | **Segurança / Autenticação** |
| `valida RN0034 rejeitando estritamente cartão com valor < R$ 10,00 quando não houver cupom (HTTP 400)` | Tenta finalizar checkout via API com cartão de R$ 5,00 sem cupons; valida rejeição estrita com HTTP 400. | **RN0034** |
| `rejeita finalização de compra quando o saldo devedor não possui cartões informados (HTTP 400)` | Tenta finalizar pedido com saldo em aberto sem enviar nenhum cartão; valida HTTP 400. | **Regras de Pagamento** |
| `rejeita cartão com valor zero ou negativo no checkout (HTTP 400)` | Tenta finalizar pedido informando cartão com valor `0.00`; valida HTTP 400 exigindo valor positivo. | **Regras de Pagamento** |

---

### 🔄 2.3 Módulo: Devoluções e Trocas (`devolucoes-trocas/`)

#### 📄 [`solicitacao-troca-ui.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/devolucoes-trocas/solicitacao-troca-ui.cy.js)
Interface do cliente para solicitação de logística reversa de compras entregues (`pedidos.html`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `deve exibir botão "Solicitar Troca" SOMENTE para pedidos com status Entregue` | **RN0043:** Valida que o botão de troca é renderizado exclusivamente em pedidos com status `Entregue`, não existindo em pedidos `EmTransporte` ou anteriores. | **RN0043 / RF0041** |
| `deve abrir o modal de troca e permitir solicitar a troca por unidade específica (1 de 2)` | Abre o modal de troca, seleciona quantidade parcial (1 de 2 peças de um produto), preenche o motivo obrigatório e valida envio a `POST /api/pedidos/701/troca`. | **RF0041** |
| `deve permitir solicitar a troca de todos os itens do pedido inteiro` | Aciona a opção de troca total e valida o envio de `trocarPedidoInteiro: true` com o motivo informado. | **RF0041** |

#### 📄 [`devolucoes-acompanhamento-ui.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/devolucoes-trocas/devolucoes-acompanhamento-ui.cy.js)
Acompanhamento dos protocolos de devolução pelo cliente (`devolucoes.html`) e fechamento do ciclo com reutilização do cupom.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `deve exibir cards ativos de troca com código reverso e permitir despachar pacote` | Renderiza pedido em `TrocaAutorizada` com código de autorização dos Correios e valida a ação do cliente de confirmar despacho (`PATCH /status` para `ItemEnviado`). | **Ciclo Logístico Reverso** |
| `deve exibir mensagem amigável de estado vazio caso o cliente não tenha devoluções` | Acessa a tela de devoluções sem protocolos ativos e valida exibição de empty state amigável. | **UX** |
| `permite a reutilização do cupom de troca gerado como forma de pagamento em uma nova compra (Logística Reversa Completa)` | **Logística Reversa Completa:** Valida que o cupom de troca emitido ao fim da devolução é aceito como forma de pagamento em um novo checkout, abatendo o total da compra. | **RF0045 / RF0036** |

#### 📄 [`notificacoes-troca-cliente.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/devolucoes-trocas/notificacoes-troca-cliente.cy.js)
Notificações automáticas emitidas quando o Administrador autoriza a troca solicitada (**RN0046**).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `deve exibir o banner de notificação no topo de Meus Pedidos quando houver aviso não lido` | Valida a renderização de banner proeminente no topo de `pedidos.html` informando a aprovação da troca do pedido. | **RN0046** |
| `deve marcar a notificação como lida e ocultar o banner ao clicar em "Marcar como lida"` | Clica no botão de dispensar notificação, dispara `PATCH /api/notificacoes/15/lida` e valida remoção do banner. | **RN0046** |

---

### ⏱️ 2.4 Módulo: Expiração de Carrinho (`expiracao-carrinho/`)

#### 📄 [`timer-carrinho-ui.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/expiracao-carrinho/timer-carrinho-ui.cy.js)
Contagem regressiva de reserva temporária de estoque e alerta preventivo (**RN0044**).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `deve exibir o temporizador ativo com contagem no formato MM:SS para reserva em andamento (janela de 15 min)` | Valida a exibição do container `#cart-timer-box` exibindo contagem regressiva formatada (`"14:..."`) e mensagem de estoque reservado. | **RN0044** |
| `deve acionar aviso visual quando restarem 5 minutos ou menos (<= 300s)` | **RN0044:** Simula tempo restante inferior a 300 segundos e valida o acionamento do alerta `"Sua reserva expira em 04:30. Finalize sua compra antes que os itens retornem ao estoque"`. | **RN0044** |

#### 📄 [`timeout-reserva-carrinho-e2e.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/expiracao-carrinho/timeout-reserva-carrinho-e2e.cy.js)
Bloqueio de compra e liberação definitiva de estoque pós-timeout (**RN0044, RNF0042, RNF0045**).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `deve desabilitar o botão de checkout e exibir banner de expiração quando o tempo esgotar` | Simula carrinho com tempo esgotado e valida que os itens são removidos, o aviso de devolução ao estoque é exibido e o botão de compra fica rigorosamente desabilitado. | **RN0044 / RNF0042 / RNF0045** |
| `deve rejeitar tentativa de finalizar checkout na API se a reserva estiver expirada (HTTP 400)` | Tenta forçar `POST /api/checkout/finalizar` com reserva de estoque vencida e valida recusa com HTTP 400. | **RN0044 / Segurança** |

---

### 🏭 2.5 Módulo: Ciclo Logístico e Estados (`troca-estados/`)

#### 📄 [`painel-pedidos-admin-e2e.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/troca-estados/painel-pedidos-admin-e2e.cy.js)
Operações administrativas de status, baixa física de estoque e autorização de trocas.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `lista os pedidos de venda com seus respectivos status, valores e próximos passos permitidos` | Valida a renderização determinística dos pedidos no painel admin (`admin/pedidos.html`) com o `<select>` preenchido apenas com os próximos status permitidos pelo domínio. | **Gestão Operacional** |
| `permite ao Admin APROVAR pagamento consolidando a baixa definitiva de estoque (RF0053, RN0028)` | **RN0028 / RF0053:** Administrador aprova o pagamento (`PagamentoRealizado`), consolidando a baixa física atômica no estoque do armazém Glaciar. | **RN0028 / RF0053** |
| `permite ao Admin REPROVAR pagamento liberando/desbloqueando itens sem baixa física (RN0028)` | **RN0028:** Administrador recusa o pagamento (`PagamentoReprovado`), garantindo que os itens reservados são desbloqueados e devolvidos ao estoque disponível sem baixa física. | **RN0028** |
| `permite ao Admin despachar pedido aprovado para entrega alterando status para EmTransporte (RF0039)` | Administrador seleciona pedido pago e altera para `EmTransporte`, registrando data de expedição e atualizando o rastreio. | **RF0039** |
| `gerencia o ciclo de troca no painel de devoluções: autorização, reentrada em estoque e geração de cupom (RF0042 a RF0045, RF0054)` | Em `admin/devolucoes.html`, o admin visualiza o motivo do cliente, autoriza a troca (`TrocaAceita`), e na chegada do pacote conclui (`Trocado`), realizando a **reentrada em estoque (RF0054)** e emitindo o **cupom de troca (RF0045)**. | **RF0042 a RF0045 / RF0054** |

#### 📄 [`maquina-estados-pedido.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/troca-estados/maquina-estados-pedido.cy.js)
Validação de integridade dos contratos da máquina de estados do pedido (`PedidoMaquinaEstados`).

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `rejeita requisições de alteração de status com payload vazio ou status nulo (HTTP 400)` | Dispara PATCH com corpo vazio e valida rejeição preventiva por validação de DTO. | **Contrato de API** |
| `rejeita alteração de status quando o cliente tenta aplicar status restrito de Administrador (HTTP 400)` | Cliente tenta aprovar o próprio pagamento ou trocar para status admin; valida rejeição por ator não autorizado. | **Segurança da Máquina de Estados** |
| `valida o contrato da máquina de estados garantindo que cada estado inicial possui próximos passos coerentes` | Valida que o mapa de estados cobre com exatidão a sequência lógica cobrada pelo professor (`EmProcessamento` ➔ `PagamentoRealizado` ➔ `EmTransporte` ➔ `Entregue` ➔ `TrocaSolicitada` ➔ `Trocado`). | **Máquina de Estados** |

---

### 🛡️ 2.6 Módulo: Validação de Atores e Segurança (`validacao-atores/`)

#### 📄 [`autorizacao-cliente-admin-status.cy.js`](file:///c:/Users/gusta/OneDrive/Área%20de%20Trabalho/estudos/fatec/5%20Sem/LES/glaciar/tests/cypress/e2e/validacao-atores/autorizacao-cliente-admin-status.cy.js)
Matriz de permissões, autorização por ator e isolamento contra vulnerabilidades IDOR.

| Nome do Teste (`it`) | O que faz / Comportamento Validado | Requisito Coberto |
| :--- | :--- | :--- |
| `Cliente NÃO PODE auto-aprovar o próprio pagamento (EmProcessamento -> PagamentoRealizado)` | Dispara PATCH autenticado como cliente tentando aprovar seu pagamento; valida bloqueio estrito com mensagem de ator não autorizado. | **Segurança de Atores** |
| `Cliente NÃO PODE auto-aprovar troca (TrocaSolicitada -> TrocaAceita)` | Cliente tenta aprovar a própria devolução; valida bloqueio do backend. | **Segurança de Atores** |
| `Cliente NÃO PODE auto-concluir troca física (ItemRecebido -> Trocado)` | Cliente tenta emitir cupom para si mesmo confirmando recebimento; valida bloqueio do backend. | **Segurança de Atores** |
| `Cliente PODE confirmar recebimento do pedido na interface (EmTransporte -> Entregue)` | Cliente aciona o botão `"Confirmar Recebimento"` na UI de `pedidos.html` e valida avanço legítimo para `Entregue`. | **Permissão de Cliente** |
| `Cliente PODE informar despacho do pacote de devolução na interface (TrocaAceita -> ItemEnviado)` | Cliente clica em `"Informar Envio"` na UI e valida avanço legítimo para `ItemEnviado`. | **Permissão de Cliente** |
| `Cliente tentando consultar pedido de outro usuário deve receber 404 sem vazamento de dados` | **Isolamento IDOR:** Cliente com `X-Usuario-Id: 99` tenta consultar pedido pertencente ao usuário `42`; valida resposta HTTP 404 sem vazar dados confidenciais. | **Segurança (IDOR)** |

---

## 🚀 3. Instruções de Execução da Suíte

### 3.1 Pré-requisitos
Certifique-se de que o servidor web do frontend está ativo (porta padrão `5500` via Live Server ou similar) e que a API .NET está em execução (porta `5205`).

### 3.2 Comandos de Execução (Cypress CLI)

```bash
# Navegar até a pasta de testes
cd tests

# 1. Executar TODA a suíte completa de forma automatizada (Headless)
npx cypress run

# 2. Executar apenas os testes de Checkout e Vendas
npx cypress run --spec "cypress/e2e/checkout-vendas-clientes/**"

# 3. Executar apenas os testes de CRUD de Clientes
npx cypress run --spec "cypress/e2e/crud-clientes/**"

# 4. Executar apenas os testes do Ciclo Logístico e Trocas
npx cypress run --spec "cypress/e2e/troca-estados/**,cypress/e2e/devolucoes-trocas/**"

# 5. Abrir interface interativa do Cypress para depuração visual
npx cypress open
```
