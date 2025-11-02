# Como Configurar DATABASE_URL na Vercel

O erro "Environment variable not found: DATABASE_URL" indica que a variável de ambiente `DATABASE_URL` não está configurada no projeto da Vercel.

## Passo a Passo para Configurar:

1. **Acesse o Dashboard da Vercel:**
   - Vá para https://vercel.com/dashboard
   - Faça login na sua conta

2. **Selecione seu Projeto:**
   - Clique no projeto "Demo" (ou o nome do seu projeto)

3. **Vá para Configurações:**
   - Clique em **Settings** (Configurações)
   - No menu lateral, clique em **Environment Variables** (Variáveis de Ambiente)

4. **Adicione a Variável DATABASE_URL:**
   - Clique em **Add New** (Adicionar Nova)
   - **Name (Nome):** `DATABASE_URL`
   - **Value (Valor):** Cole a string de conexão do seu banco PostgreSQL (Neon)
     - Exemplo: `postgresql://user:password@host:port/database?sslmode=require`
   - **Environments (Ambientes):** Selecione:
     - ✅ Production (Produção)
     - ✅ Preview (Preview)
     - ✅ Development (Desenvolvimento)
   - Clique em **Save** (Salvar)

5. **Redeploy do Projeto:**
   - Após adicionar a variável, vá para **Deployments** (Deployments)
   - Clique nos três pontos (⋯) do último deploy
   - Selecione **Redeploy** (Refazer Deploy)
   - Ou faça um novo commit e push para o repositório

## Onde Obter a DATABASE_URL?

### Se você usa Neon (PostgreSQL):

1. Acesse https://console.neon.tech
2. Faça login na sua conta
3. Selecione seu projeto/banco de dados
4. Vá para **Connection Details** (Detalhes de Conexão)
5. Copie a **Connection String** (String de Conexão)
6. Use essa string como valor de `DATABASE_URL`

### Formato da DATABASE_URL:

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## Importante:

- ⚠️ **Nunca commite a DATABASE_URL** no código ou no Git
- ⚠️ A variável é sensível e deve estar apenas nas variáveis de ambiente da Vercel
- ✅ Use diferentes bancos para Production, Preview e Development se necessário

## Verificar se Funcionou:

Após configurar e fazer redeploy:
1. Tente conectar uma API Saipos novamente
2. O erro "Environment variable not found: DATABASE_URL" não deve mais aparecer
3. A conexão com o banco deve funcionar normalmente

