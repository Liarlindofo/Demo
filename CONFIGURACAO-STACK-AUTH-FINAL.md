# Configuração Final do Stack Auth

## Visão Geral

Este projeto utiliza o Stack Auth para autenticação com suporte a:
- Login com email/senha
- Login com Google OAuth
- Modo de desenvolvimento sem autenticação real
- URLs limpas sem parâmetros visíveis

## Arquivos Modificados

### 1. `src/stack.ts`
- URLs dinâmicas baseadas no ambiente (localhost em dev, produção em prod)
- Suporte a modo DEV_AUTH_BYPASS
- URLs configuradas corretamente para produção e desenvolvimento

### 2. `src/app/layout.tsx`
- Suporte a modo bypass em desenvolvimento
- Desabilita StackProvider quando em modo bypass

### 3. `src/app/dashboard/layout.tsx`
- Usuário mockado em modo bypass
- Redirecionamento automático para login se não autenticado
- Suporte a logout

### 4. `src/app/auth/login/page.tsx` e `src/app/auth/register/page.tsx`
- Redirecionamento automático em modo bypass
- Integração com Stack Auth em modo normal

### 5. `src/app/page.tsx`
- Botões "Entrar" e "Cadastrar" em modo normal
- Botão único "Entrar" em modo bypass

### 6. `middleware.ts`
- Limpeza automática de parâmetros de URL
- Remoção de `?code=xxx` e `?after_auth_return_to=...`

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID=seu-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=seu-publishable-key
STACK_SECRET_SERVER_KEY=seu-secret-key

# Base URL (produção)
NEXT_PUBLIC_BASE_URL=https://platefull.com.br

# Development Auth Bypass
# Defina como 'true' para desenvolvimento local sem autenticação real
NEXT_PUBLIC_DEV_AUTH_BYPASS=false

# Outras configurações
DATABASE_URL=sua-database-url
SENDGRID_API_KEY=seu-sendgrid-api-key
```

## Configuração para Produção

### 1. Configurar Domínios no Stack Auth Dashboard

1. Acesse: https://app.stack-auth.com/
2. Vá para o projeto `26dbad35-bdd4-497b-b94c-142f01758197`
3. Em **Settings** > **Trusted Domains**, adicione:
   - `https://platefull.com.br`
   - `http://localhost:3000` (para testes)

### 2. Configurar Callback URLs

No Stack Auth Dashboard, configure as seguintes URLs:

- **Sign In URL**: `https://platefull.com.br/auth/login`
- **Sign Up URL**: `https://platefull.com.br/auth/register`
- **After Sign In**: `https://platefull.com.br/dashboard`
- **After Sign Up**: `https://platefull.com.br/dashboard`
- **Handler URL**: `https://platefull.com.br/handler`

### 3. Configurar OAuth (Google)

1. No Stack Auth Dashboard, vá para **Authentication** > **OAuth**
2. Configure Google OAuth Provider
3. Configure as URLs de callback:
   - `https://platefull.com.br/handler/oauth-callback`

## Modo de Desenvolvimento

Para desenvolvimento local sem autenticação real:

1. Defina no `.env.local`:
   ```env
   NEXT_PUBLIC_DEV_AUTH_BYPASS=true
   ```

2. O sistema usará um usuário mockado:
   - ID: `dev-user`
   - Email: `dev@teste.com`
   - Nome: `Dev Teste`

3. Acesso direto ao dashboard sem necessidade de login

## Como Usar

### Desenvolvimento Local (com Autenticação Real)

1. Configure as variáveis de ambiente no `.env.local`
2. Configure `localhost:3000` no Stack Auth Dashboard
3. Execute `npm run dev`
4. Acesse `http://localhost:3000`
5. Use os botões "Entrar" ou "Cadastrar"

### Desenvolvimento Local (Sem Autenticação - Bypass)

1. Configure `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` no `.env.local`
2. Execute `npm run dev`
3. Acesse `http://localhost:3000`
4. Clique em "Entrar" - será redirecionado direto para o dashboard
5. Não é necessário login real

### Produção

1. Configure todas as variáveis de ambiente na Vercel (ou seu provedor)
2. Configure os domínios no Stack Auth Dashboard
3. Deploy para produção
4. Teste o fluxo de autenticação completo

## Resolução de Problemas

### Erro 500 no Login com Google

**Causa**: Callback URL não configurada corretamente

**Solução**:
1. Verifique se `https://platefull.com.br` está nos domínios confiáveis
2. Verifique se a callback URL `https://platefull.com.br/handler/oauth-callback` está configurada
3. Verifique se as variáveis de ambiente estão configuradas corretamente

### Parâmetros Visíveis na URL

**Causa**: Middleware não está executando

**Solução**:
1. Verifique se `middleware.ts` está na raiz do projeto
2. Reinicie o servidor Next.js

### Botão "Sign up" não funciona

**Causa**: Rota não configurada

**Solução**: 
- Implementado na página inicial com link para `/auth/register`

### Redirecionamento não funciona

**Causa**: URLs mal configuradas

**Solução**:
1. Verifique `src/stack.ts` se as URLs estão corretas
2. Verifique as URLs no Stack Auth Dashboard
3. Reinicie o servidor

## Checklist de Verificação

Antes de fazer deploy para produção:

- [ ] Variáveis de ambiente configuradas
- [ ] Domínios configurados no Stack Auth Dashboard
- [ ] Callback URLs configuradas
- [ ] Google OAuth configurado (se necessário)
- [ ] Middleware configurado
- [ ] Teste de login local funciona
- [ ] Teste de cadastro local funciona
- [ ] Teste de OAuth local funciona (se configurado)
- [ ] Deploy realizado
- [ ] Teste de login em produção
- [ ] Teste de cadastro em produção
- [ ] Teste de OAuth em produção (se configurado)

## Notas Importantes

1. **Nunca comite `.env.local`**: Adicione ao `.gitignore`
2. **Use NEXT_PUBLIC_** para variáveis acessíveis no cliente
3. **USE variáveis sem NEXT_PUBLIC_** apenas no servidor
4. **Modo bypass** deve ser usado apenas em desenvolvimento
5. **URLs de produção** devem usar HTTPS

## Links Úteis

- [Stack Auth Documentation](https://docs.stack-auth.com/)
- [Stack Auth Dashboard](https://app.stack-auth.com/)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

