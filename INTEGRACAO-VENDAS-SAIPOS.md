# Integração de Vendas Saipos - Total Amount e Clientes Únicos

Este documento descreve a implementação completa da integração com a API Saipos para capturar dados de vendas, incluindo o **total_amount** e o cálculo de **clientes únicos** e **ticket médio**.

## 📊 O que foi implementado

### 1. Campo `uniqueCustomers` na tabela `SalesDaily`

Foi adicionado o campo `uniqueCustomers` no modelo `SalesDaily` do Prisma para armazenar o número de clientes únicos por dia.

**Schema atualizado:**
```prisma
model SalesDaily {
  id              String   @id @default(cuid())
  apiId           String
  api             UserAPI  @relation(fields: [apiId], references: [id])
  storeId         String
  date            DateTime
  totalOrders     Int
  totalSales      Float
  uniqueCustomers Int      @default(0)  // NOVO CAMPO
  channels        Json?
  createdAt       DateTime @default(now())

  @@unique([apiId, date], name: "sales_daily_api_date_unique")
  @@index([apiId, date])
  @@map("sales_daily")
}
```

### 2. Serviço de Agregação de Dados

Foi criado o arquivo `src/lib/sales-aggregation.ts` que contém as funções para agregar dados de vendas individuais (tabela `Sale`) em dados diários (tabela `SalesDaily`).

**Funcionalidades:**
- ✅ Extrai o `total_amount` de cada venda
- ✅ Calcula o número de clientes únicos por dia (baseado em `customer.id_customer`)
- ✅ Calcula o ticket médio automaticamente (totalSales / totalOrders)
- ✅ Agrupa vendas por dia
- ✅ Salva dados agregados na tabela `SalesDaily`

**Funções principais:**
- `aggregateSalesData(apiId, storeId, startDate, endDate)` - Agrega dados para uma API específica
- `aggregateAllAPIs(days)` - Agrega dados para todas as APIs ativas

### 3. Integração Automática na Sincronização

A função de agregação foi integrada no processo de sincronização (`src/lib/saipos/sync.ts`). Após cada sincronização bem-sucedida, os dados são automaticamente agregados.

**Fluxo:**
1. Sincronização busca dados da API Saipos
2. Dados brutos são salvos na tabela `Sale`
3. **Agregação automática é executada**
4. Dados agregados são salvos na tabela `SalesDaily`

### 4. Rota API para Agregação Manual

Foi criada a rota `/api/saipos/aggregate` para agregar dados manualmente quando necessário.

**Endpoints:**

#### GET `/api/saipos/aggregate?days=15`
Agrega dados de vendas para todas as APIs ativas do usuário autenticado.

**Parâmetros de Query:**
- `days` (opcional): Número de dias para agregar (padrão: 15)

**Exemplo:**
```bash
GET /api/saipos/aggregate?days=30
```

#### POST `/api/saipos/aggregate`
Agrega dados de vendas para uma API específica ou todas as APIs do usuário.

**Body (JSON):**
```json
{
  "apiId": "api_123456",  // Opcional: se não fornecido, agrega todas as APIs
  "days": 15              // Opcional: padrão 15 dias
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Dados agregados com sucesso para 1 APIs",
  "data": {
    "apisProcessed": 1,
    "totalDaysAggregated": 15,
    "period": {
      "start": "2025-11-03",
      "end": "2025-11-18"
    },
    "results": [
      {
        "apiId": "api_123456",
        "apiName": "Loja Principal",
        "storeId": "store_789",
        "success": true,
        "daysAggregated": 15,
        "totalSales": 45678.90,
        "totalOrders": 234,
        "uniqueCustomers": 156,
        "errors": []
      }
    ],
    "errors": []
  }
}
```

### 5. Atualização das Rotas de Dashboard

As rotas de dashboard foram atualizadas para retornar o campo `uniqueCustomers`:

- `/api/dashboard/metrics` - Retorna métricas agregadas incluindo clientes únicos
- `/api/dashboard/sales` - Retorna dados de vendas incluindo clientes únicos por dia

**Exemplo de resposta:**
```json
{
  "data": [
    {
      "date": "2025-11-18",
      "totalSales": 3456.78,
      "totalOrders": 23,
      "averageTicket": 150.29,
      "uniqueCustomers": 18,  // NOVO CAMPO
      "channels": null
    }
  ],
  "summary": {
    "totalSales": 45678.90,
    "totalOrders": 234,
    "averageTicket": 195.12,
    "uniqueCustomers": 156  // NOVO CAMPO
  }
}
```

## 🚀 Como usar

### 1. Sincronizar dados da API Saipos

Os dados são sincronizados automaticamente via cron jobs ou podem ser sincronizados manualmente através das rotas existentes:

- `/api/saipos/sync` - Sincronização manual
- `/api/saipos/sync-all` - Sincronizar todas as APIs
- `/api/cron/sync-saipos` - Cron job automático

**Após a sincronização, a agregação é executada automaticamente.**

### 2. Agregar dados manualmente (se necessário)

Se você precisar reagregar dados existentes ou agregar dados de um período específico:

```bash
# Agregar últimos 15 dias para todas as APIs do usuário
GET /api/saipos/aggregate?days=15

# Agregar últimos 30 dias
GET /api/saipos/aggregate?days=30

# Agregar API específica (POST)
POST /api/saipos/aggregate
Content-Type: application/json

{
  "apiId": "clxxxxxx",
  "days": 15
}
```

### 3. Consultar dados agregados

Use as rotas de dashboard para consultar os dados agregados:

```bash
# Métricas agregadas
GET /api/dashboard/metrics?storeId=XXX&start=2025-11-01&end=2025-11-18

# Dados de vendas por dia
GET /api/dashboard/sales?storeId=XXX&range=15d
```

## 📋 Campos Capturados da API Saipos

### Da tabela `Sale` (vendas individuais):

- `externalId` - ID único da venda na Saipos
- `storeId` - ID da loja
- `userId` - ID do usuário (dono da loja)
- `saleDateUtc` - Data da venda
- **`totalAmount`** - ✅ **Valor total da venda (total_amount)**
- `rawJson` - JSON completo da venda (inclui customer.id_customer)

### Para a tabela `SalesDaily` (dados agregados):

- `date` - Data (formato YYYY-MM-DD)
- `totalSales` - ✅ **Soma de todos os total_amount do dia**
- `totalOrders` - Total de pedidos
- **`uniqueCustomers`** - ✅ **Número de clientes únicos (baseado em customer.id_customer)**
- `averageTicket` - ✅ **Ticket médio calculado (totalSales / totalOrders)**

## 🔍 Como o Cálculo é Feito

### Clientes Únicos

1. Para cada venda do dia, extraímos o `customer.id_customer` do campo `rawJson`
2. Armazenamos em um `Set<string>` para garantir unicidade
3. O tamanho do Set é o número de clientes únicos

```typescript
const uniqueCustomerIds = new Set<string>();

for (const sale of daySales) {
  const customerId = extractCustomerId(sale.rawJson);
  if (customerId) {
    uniqueCustomerIds.add(customerId);
  }
}

const uniqueCustomers = uniqueCustomerIds.size;
```

### Ticket Médio

Calculado automaticamente:
```typescript
const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
```

## 📊 Estrutura de Dados da API Saipos

Baseado na imagem fornecida, a API Saipos retorna os seguintes campos relevantes:

- `total_amount` - Valor total da venda (já inclui descontos, acréscimos, taxa de serviço e taxa de entrega)
- `customer` - Objeto com dados do cliente
  - `id_customer` - ID único do cliente (usado para contar clientes únicos)
- `shift_date` - Data do turno (usada para agrupar vendas por dia)
- `id_sale_type` - Tipo de venda (1=Delivery, 2=Balcão, 3=Salão, 4=Ficha)

## ⚡ Performance

- A agregação é executada de forma eficiente, processando vendas em lote
- Usa `upsert` para evitar duplicatas
- Agrupa vendas por dia antes de processar
- Calcula clientes únicos usando `Set` (O(1) para inserção e busca)

## 🔄 Manutenção

### Reagregar dados existentes

Se você precisar reagregar dados históricos:

```bash
# Reagregar últimos 30 dias
GET /api/saipos/aggregate?days=30
```

### Verificar logs

A agregação gera logs detalhados no console:
- 📊 Início da agregação
- ✅ Sucesso na agregação de cada dia
- ❌ Erros (se houver)
- 📊 Resumo final

## 🎯 Próximos Passos (Opcional)

- [ ] Adicionar campo `channels` na agregação (dividir por canal de venda)
- [ ] Criar dashboard visual para mostrar clientes únicos
- [ ] Adicionar filtros por tipo de venda (delivery, balcão, etc.)
- [ ] Criar relatórios de recorrência de clientes

## ✅ Checklist de Implementação

- ✅ Campo `uniqueCustomers` adicionado no schema
- ✅ Serviço de agregação criado
- ✅ Integração automática na sincronização
- ✅ Rota API para agregação manual
- ✅ Rotas de dashboard atualizadas
- ✅ Banco de dados migrado
- ✅ Documentação criada

---

## 📝 Notas Técnicas

### Extração do Customer ID

A função `extractCustomerId` tenta extrair o ID do cliente de várias formas:
1. `customer.id_customer` (formato padrão)
2. `id_customer` (campo direto)
3. `customer_id` (alternativo)

Isso garante compatibilidade com diferentes formatos da API Saipos.

### Tratamento de Erros

- Erros na agregação são logados mas não falham a sincronização
- Cada dia é processado independentemente
- Erros são retornados no array `errors` da resposta

### Timezone

- Todas as datas são normalizadas para UTC no banco de dados
- A agregação agrupa vendas pela data UTC
- O frontend pode converter para timezone local conforme necessário

---

**Desenvolvido por:** Cursor AI + Claude Sonnet 4.5
**Data:** 18 de novembro de 2025

