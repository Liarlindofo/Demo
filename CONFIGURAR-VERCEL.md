# Como Configurar DATABASE_URL na Vercel

O erro "Environment variable not found: DATABASE_URL" indica que a variável de ambiente `DATABASE_URL` não está configurada no projeto da Vercel.

## ⚠️ Se você ver o erro: "The table `public.stack_users` does not exist"

Isso significa que as tabelas do banco não foram criadas. Veja a seção "Criar Tabelas do Banco" abaixo.

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

## Criar Tabelas do Banco

Se você ver o erro **"The table `public.stack_users` does not exist"**, as tabelas do banco não foram criadas.

### Opção 1: Criar Tabelas Localmente e Depois Deployar

1. **Configure a DATABASE_URL localmente:**
   - Crie um arquivo `.env.local` na raiz do projeto
   - Adicione: `DATABASE_URL="sua_string_de_conexao_aqui"`

2. **Crie as tabelas:**
   ```bash
   npx prisma db push
   ```
   Isso criará todas as tabelas no banco.

3. **Faça commit e push:**
   - Faça commit das alterações
   - Faça push para o repositório
   - A Vercel fará deploy automaticamente

### Opção 2: Criar Tabelas Diretamente na Vercel

O script de build da Vercel agora inclui `prisma db push`, que criará as tabelas automaticamente no primeiro deploy após configurar `DATABASE_URL`.

1. Configure a `DATABASE_URL` nas variáveis de ambiente (veja seção acima)
2. Faça um novo deploy (push para o repositório ou redeploy manual)
3. Durante o build, o Prisma criará as tabelas automaticamente

### ⚠️ Importante sobre `prisma db push`:

- ✅ **Funciona bem para desenvolvimento e primeira configuração**
- ⚠️ **Não é ideal para produção com dados existentes**
- 💡 **Para produção com dados reais, use migrações:**
  ```bash
  npx prisma migrate dev --name init
  ```

## Verificar se Funcionou:

Após configurar e fazer redeploy:
1. Tente conectar uma API Saipos novamente
2. O erro "Environment variable not found: DATABASE_URL" não deve mais aparecer
3. O erro "The table does not exist" não deve mais aparecer
4. A conexão com o banco deve funcionar normalmente

