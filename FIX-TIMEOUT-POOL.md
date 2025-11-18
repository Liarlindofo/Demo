# 🔧 Correção: Timeout no Pool de Conexões

## Erro: "Timed out acquiring connection from connection pool"

Este erro acontece quando o pool de conexões do Prisma está esgotado. Vou explicar como corrigir.

## ✅ Solução Implementada no Código

Já atualizei os arquivos `src/lib/prisma.ts` e `src/lib/db.ts` com:
- ✅ Configuração otimizada do PrismaClient
- ✅ Graceful shutdown (desconectar ao terminar)
- ✅ Singleton pattern (apenas uma instância)

## 🚀 O que você precisa fazer AGORA na Vercel

### 1. Atualizar a DATABASE_URL na Vercel

A DATABASE_URL precisa ter parâmetros de pool de conexões otimizados para produção.

**Formato atual (ERRADO):**
```
postgresql://user:password@host:5432/database?sslmode=require
```

**Formato correto (CERTO):**
```
postgresql://user:password@host:5432/database?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20
```

### 2. Passo a Passo para Atualizar

1. **Acesse o Painel da Vercel:**
   - Vá para https://vercel.com/dashboard
   - Selecione seu projeto (Demo)
   - Clique em **Settings**
   - Clique em **Environment Variables**

2. **Edite a DATABASE_URL:**
   - Encontre a variável `DATABASE_URL`
   - Clique em **Edit** (lápis)
   - Adicione os parâmetros ao final da URL:

3. **Adicione estes parâmetros:**

```bash
# Se você usa NEON (recomendado):
?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20

# Se você NÃO usa NEON (outros PostgreSQL):
?sslmode=require&connection_limit=20&pool_timeout=20&connect_timeout=10
```

### 3. Exemplo Completo (NEON)

**URL Original:**
```
postgresql://user:password@ep-odd-sunset-ac2loti5-pooler.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require
```

**URL Corrigida (adicione os parâmetros):**
```
postgresql://user:password@ep-odd-sunset-ac2loti5-pooler.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20
```

### 4. Explicação dos Parâmetros

| Parâmetro | Valor | O que faz |
|-----------|-------|-----------|
| `pgbouncer=true` | true | Usa pooler do Neon (recomendado) |
| `connection_limit=10` | 10-20 | Número máximo de conexões no pool |
| `pool_timeout=20` | 20 | Timeout em segundos para obter conexão |
| `connect_timeout=10` | 10 | Timeout para conectar ao banco |
| `sslmode=require` | require | Requer SSL (segurança) |

### 5. Redeploy do Projeto

Após alterar a DATABASE_URL:

1. **Vá para Deployments**
2. **Clique nos 3 pontos (⋯)** no último deploy
3. **Clique em "Redeploy"**

Ou simplesmente faça um novo commit:

```bash
git add .
git commit -m "fix: otimizar pool de conexões do Prisma"
git push
```

## 🔍 Para o Neon especificamente

Se você usa **Neon** (recomendado), você tem 2 connection strings:

### Connection Pooler (USE ESTA ✅)
```
postgresql://user:password@host-pooler.region.aws.neon.tech:5432/neondb
```
**Adicione:** `?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20`

### Direct Connection (NÃO USE ❌)
```
postgresql://user:password@host.region.aws.neon.tech:5432/neondb
```
**Não use esta para Vercel!** Ela não escala bem.

## 📊 Limites Recomendados por Plano

### Neon Free Plan
```
connection_limit=5
pool_timeout=15
```

### Neon Pro Plan
```
connection_limit=10
pool_timeout=20
```

### Neon Scale Plan
```
connection_limit=20
pool_timeout=30
```

## ⚙️ Variáveis de Ambiente Completas

Além da DATABASE_URL, certifique-se de ter configurado:

```env
# Banco de dados (PRINCIPAL - CORRIJA ESTA)
DATABASE_URL="postgresql://user:pass@host-pooler:5432/db?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20"

# Stack Auth (se ainda não tem)
NEXT_PUBLIC_STACK_PROJECT_ID="seu_project_id"
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="sua_key"
STACK_SECRET_SERVER_KEY="sua_secret_key"

# Saipos (se estiver usando)
NEXT_PUBLIC_SAIPOS_API_KEY="seu_token_saipos"
NEXT_PUBLIC_SAIPOS_BASE_URL="https://data.saipos.io/v1"
```

## 🧪 Como Testar se Funcionou

1. **Faça redeploy na Vercel**
2. **Acesse sua aplicação** em produção
3. **Tente conectar uma API Saipos**
4. **O erro de timeout NÃO deve mais aparecer**

Se o erro persistir:

### Opção A: Aumentar ainda mais o timeout
```
pool_timeout=30&connect_timeout=15
```

### Opção B: Reduzir conexões simultâneas
```
connection_limit=5
```

### Opção C: Usar Direct Connection (última opção)

Se o Pooler do Neon estiver com problemas, você pode temporariamente usar a conexão direta:

1. No Neon, copie a **Direct Connection String** (sem -pooler)
2. Adicione: `?sslmode=require&connection_limit=3&pool_timeout=30`
3. **IMPORTANTE:** A conexão direta tem limite muito baixo (poucos usuários simultâneos)

## 🚨 Problemas Conhecidos e Soluções

### Erro persiste após configuração

**Causa:** Cache do Vercel ainda está usando configuração antiga

**Solução:**
1. Vá em Settings > Environment Variables
2. Delete a DATABASE_URL
3. Adicione novamente com os parâmetros corretos
4. Faça um Redeploy COMPLETO (não só rerun)

### Timeout só acontece às vezes

**Causa:** Pico de tráfego ou conexões não fechadas

**Solução:**
1. Verifique se há cron jobs rodando simultaneamente
2. Aumente `connection_limit=15`
3. Configure rate limiting nas APIs

### Banco está lento

**Causa:** Plano gratuito do Neon pode ter limitações

**Solução:**
1. Verifique uso no dashboard do Neon
2. Considere upgrade para plano pago
3. Otimize queries lentas

## ✅ Checklist Final

- [ ] DATABASE_URL atualizada na Vercel com parâmetros corretos
- [ ] Usando Connection Pooler (URL com `-pooler`)
- [ ] Parâmetros: `pgbouncer=true&connection_limit=10&pool_timeout=20`
- [ ] Redeploy feito na Vercel
- [ ] Testado conexão em produção
- [ ] Erro de timeout não aparece mais

## 📝 Código Atualizado

Os arquivos já foram corrigidos:
- ✅ `src/lib/prisma.ts` - Pool otimizado
- ✅ `src/lib/db.ts` - Pool otimizado
- ✅ `src/lib/sales-aggregation.ts` - Campo channels corrigido

Agora você só precisa:
1. **Fazer commit e push**
2. **Atualizar DATABASE_URL na Vercel**
3. **Fazer redeploy**

---

**Data:** 18 de novembro de 2025
**Desenvolvido por:** Cursor AI + Claude Sonnet 4.5

