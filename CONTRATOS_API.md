# 📡 Contratos de API (Endpoints, Payloads & Códigos HTTP)

> Especificação técnica detalhada das rotas HTTP, contratos de entrada e saída (JSON), headers de autenticação/contexto e códigos de status da API do **Glaciar E-Commerce**.

---

## 📌 1. Visão Geral e Headers Globais

A API do Glaciar adota o protocolo HTTP/REST com payloads estruturados em formato JSON (`application/json`).
* **Base URL:** `http://localhost:5205/api` (ambiente local ou contêiner Docker).
* **Identificação de Contexto de Cliente:** Rotas transacionais e protegidas do cliente exigem o header:
  `X-Usuario-Id: <id_do_usuario>` (ex: `X-Usuario-Id: 42`).
* **Tratamento Global de Erros:** Exceções de domínio retornam formato padronizado com `message` clara e array opcional de `erros`.

---

## 🛒 2. Contratos de Checkout e Carrinho

### 2.1 Finalizar Checkout
Realiza a validação atômica, cálculo de frete, aplicação de cupons, liquidação em múltiplos cartões e baixa atômica de estoque.

* **Método & Rota:** `POST /api/checkout/finalizar`
* **Headers:**
  - `Content-Type: application/json`
  - `X-Usuario-Id: 42`

#### Payload de Envio (Request Body)
```json
{
  "usuarioEnderecoId": null,
  "novoEndereco": {
    "cep": "01310100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Andar 15",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "estado": "SP",
    "salvarNoPerfil": true,
    "apelido": "Escritório Paulista"
  },
  "codigosCupons": [
    "GLACIAR100",
    "TROCA50"
  ],
  "cartoes": [
    {
      "usuarioCartaoId": 5,
      "novoCartao": null,
      "valor": 30.00
    },
    {
      "usuarioCartaoId": null,
      "novoCartao": {
        "numero": "4916511493269188",
        "bandeira": "Visa",
        "mesValidade": 11,
        "anoValidade": 2028,
        "cvv": "123",
        "salvarNoPerfil": true
      },
      "valor": 20.00
    }
  ]
}
```

#### Payload de Retorno (Response Body — HTTP 200 OK)
```json
{
  "id": 850,
  "codigo": "PED-20261006-850",
  "data": "2026-10-06T19:50:00Z",
  "status": "EmProcessamento",
  "subtotal": 180.00,
  "valorFrete": 20.00,
  "valorAbatidoCupons": 150.00,
  "valorTotal": 50.00,
  "valorPagoCartoes": 50.00,
  "enderecoEntrega": {
    "id": 15,
    "cep": "01310100",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "complemento": "Andar 15",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "estado": "SP"
  },
  "itens": [
    {
      "id": 101,
      "estoqueId": 4,
      "produtoId": 2,
      "nomeProduto": "Casaco Polar Térmico",
      "tamanho": "G",
      "cor": "Preto",
      "sku": "CAS-POL-G-PRT",
      "precoUnitario": 180.00,
      "quantidade": 1,
      "subtotal": 180.00
    }
  ],
  "pagamentos": [
    {
      "id": 201,
      "valor": 30.00,
      "metodo": 1,
      "status": 1,
      "cartaoUltimosDigitos": "1234",
      "cartaoBandeira": "Mastercard"
    },
    {
      "id": 202,
      "valor": 20.00,
      "metodo": 1,
      "status": 1,
      "cartaoUltimosDigitos": "9188",
      "cartaoBandeira": "Visa"
    }
  ],
  "cuponsAplicados": [
    {
      "id": 99,
      "codigo": "GLACIAR100",
      "valorDesconto": 100.00,
      "categoria": "Promocional"
    },
    {
      "id": 88,
      "codigo": "TROCA50",
      "valorDesconto": 50.00,
      "categoria": "Troca"
    }
  ],
  "cupomTrocaGerado": null
}
```

---

### 2.2 Obter Contexto do Checkout
Carrega os endereços cadastrados, cartões salvos, cupons disponíveis e itens ativos do carrinho.
* **Método & Rota:** `GET /api/checkout/contexto`
* **Headers:** `X-Usuario-Id: 42`
* **Retorno (HTTP 200 OK):**
```json
{
  "enderecos": [
    { "id": 10, "apelido": "Casa", "logradouro": "Rua das Pedras", "numero": "12", "cidade": "Campos do Jordão", "estado": "SP", "cep": "12460000", "padrao": true }
  ],
  "cartoes": [
    { "id": 5, "ultimosDigitos": "1234", "bandeira": "Mastercard", "nomeImpresso": "CARLOS SILVA", "padrao": true }
  ],
  "itens": [
    { "id": 1, "produtoId": 10, "nomeProduto": "Mochila Expedição 65L", "quantidade": 1, "precoUnitario": 450.00, "subtotal": 450.00 }
  ],
  "cupons": [
    { "codigo": "BEMVINDO10", "tipo": "Promocional", "valor": 10.00 }
  ]
}
```

---

### 2.3 Sincronização em Lote do Carrinho (Batch Diff)
Envia exclusivamente o diferencial de quantidades alteradas ou removidas no carrinho antes de avançar para o checkout.
* **Método & Rota:** `PUT /api/carrinho/itens`
* **Headers:** `X-Usuario-Id: 42`
* **Payload de Envio:**
```json
[
  { "itemId": 101, "quantidade": 2 },
  { "itemId": 102, "quantidade": 0 }
]
```
* **Retorno:** `HTTP 204 No Content`

---

## 🔁 3. Contratos de Transições de Status e Logística Reversa

### 3.1 Atualização Operacional pelo Administrador
* **Método & Rota:** `PATCH /api/admin/pedidos/{id}/status`
* **Headers:** `Content-Type: application/json`
* **Body:**
```json
{
  "status": "EmTransporte"
}
```
* **Retorno (HTTP 200 OK):**
```json
{
  "message": "Status atualizado com sucesso.",
  "dados": {
    "pedidoId": 42,
    "codigo": "GLC-20261019-A1B2C3",
    "statusAnterior": "PagamentoRealizado",
    "statusAtual": "EmTransporte",
    "proximosStatus": ["Entregue"],
    "cupomTrocaGerado": null
  }
}
```

---

### 3.2 Confirmação / Ação pelo Cliente
Permite apenas transições permitidas para o cliente (`Entregue`, `ItemEnviado`).
* **Método & Rota:** `PATCH /api/pedidos/{id}/status`
* **Headers:**
  - `Content-Type: application/json`
  - `X-Usuario-Id: 10`
* **Body:**
```json
{
  "status": "Entregue"
}
```
* **Retorno (HTTP 200 OK):** Confirmação de status e novos próximos passos válidos.

---

### 3.3 Solicitar Troca (Logística Reversa)
* **Método & Rota:** `POST /api/pedidos/{id}/troca`
* **Headers:** `X-Usuario-Id: 10`
* **Body (Troca Parcial ou Total):**
```json
{
  "trocarPedidoInteiro": false,
  "motivo": "O tamanho G ficou grande, preciso solicitar troca para o tamanho M.",
  "itens": [
    { "itemPedidoId": 101, "quantidade": 1 }
  ]
}
```
* **Retorno (HTTP 200 OK):**
```json
{
  "message": "Solicitação de troca registrada com sucesso.",
  "protocolo": "TRC-20261021-0042",
  "status": "TrocaSolicitada"
}
```

---

## ⚠️ 4. Códigos de Retorno HTTP e Tratamento Centralizado

| Código HTTP | Significado no Glaciar | Exemplos de Ocorrência |
| :--- | :--- | :--- |
| **`200 OK`** | Operação realizada com sucesso retornando corpo de dados. | Finalização de checkout, consulta de contexto, atualização de status. |
| **`201 Created`** | Recurso criado com sucesso. | Cadastro de cliente, novo endereço ou novo cartão. |
| **`204 No Content`** | Ação concluída com sucesso sem corpo de resposta. | Sincronização diferencial do carrinho (`PUT /api/carrinho/itens`). |
| **`400 Bad Request`** | Violação de regra de negócio (`DomainValidationException`). | Cartão com valor < R$ 10 sem cupom (RN0034), 2º cupom promocional (RN0033), transição de status ilegal na máquina de estados. |
| **`401 Unauthorized`** | Falha de autenticação ou conta inativa. | Credenciais inválidas ou tentativa de login com conta desativada (RF0023). |
| **`404 Not Found`** | Recurso inexistente ou isolamento de segurança (IDOR). | Pedido pertencente a outro cliente (`X-Usuario-Id` divergente) ou ID inválido. |
| **`409 Conflict`** | Concorrência otimista (`ConflitoDeConcorrenciaException`). | Dois administradores tentaram alterar o status do mesmo pedido simultaneamente. |

---

## 🔗 Referências Relacionadas
* [Regras de Negócio de Checkout e Cupons](./REGRAS_CHECKOUT.md)
* [Máquina de Estados e Matriz de Transições](./MAQUINA_DE_ESTADOS.md)
* [Catálogo de Casos de Teste de API](./CASOS_DE_TESTE.md)
