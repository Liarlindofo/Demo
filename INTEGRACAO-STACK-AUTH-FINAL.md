# Integração Completa Stack Auth + Prisma - Drin Platform

## ✅ Configuração Finalizada

Este documento descreve a integração completa do Stack Auth com Prisma em produção para a plataforma Drin (https://platefull.com.br).

## 🏗️ Arquitetura

### Fluxo de Autenticação

1. **Usuário acessa o site** (`https://platefull.com.br`)
2. **Clica em "Entrar"** → redireciona para `/auth/login`
3. **Faz login com Stack Auth** (email/senha ou Google OAuth)
4. **Stack Auth redireciona** para `/handler` (handler do Stack)
5. **Handler sincroniza dados** com banco Prisma
6. **Redireciona para `/dashboard`** com usuário autenticado

### Componentes Principais

#### 1. Stack Auth Configuration (`src/stack.ts`)
```typescript
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  urls: {
    signIn: `${baseUrl}/auth/login`,
    signUp: `${baseUrl}/auth/register`,
    afterSignIn: `${baseUrl}/dashboard`,
    afterSignUp: `${baseUrl}/dashboard`,
    afterSignOut: `${baseUrl}/`,
    handler: `${baseUrl}/handler`,
  },
});
```

#### 2. Handler de Callback (`src/app/handler/[...stack]/page.tsx`)
- Processa o callback do Stack Auth
- Sincroniza usuário com banco de dados
- Redireciona para dashboard

#### 3. Serviço de Sincronização (`src/lib/stack-auth-sync.ts`)
- `syncStackAuthUser()`: Sincroniza ou cria usuário no banco
- `getUserByStackId()`: Busca usuário por ID do Stack Auth

#### 4. Schema Prisma Atualizado (`prisma/schema.prisma`)

```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  username      String     @unique
  password      String?    // Opcional, para usuários Stack Auth
  fullName      String?
  cnpj          String?
  birthDate     DateTime?
  isAdmin       Boolean    @default(false)
  stackUserId   String?    @unique
  stackUser     StackUser? @relation(...)
  stores        Store[]
  apis          UserAPI[]
}

model StackUser {
  id              String    @id @default(uuid())
  primaryEmail    String?   @unique
  displayName     String?
  profileImageUrl String?
  userId          String?
  user            User?
}
```

## 🚀 Deploy e Configuração

### 1. Variáveis de Ambiente (Vercel)

Configure no painel da Vercel:

```env
NEXT_PUBLIC_STACK_PROJECT_ID=sua-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=sua-publishable-key
STACK_SECRET_SERVER_KEY=sua-secret-server-key
NEXT_PUBLIC_BASE_URL=https://platefull.com.br
DATABASE_URL=sua-database-url
```

### 2. Stack Auth Dashboard

1. Acesse: https://app.stack-auth.com/
2. Vá para seu projeto
3. **Trusted Domains**: Adicione `https://platefull.com.br`
4. **Callback URLs**: Configure:
   - `https://platefull.com.br/handler`
   - `https://platefull.com.br/dashboard`

### 3. Banco de Dados

Execute as migrações do Prisma:

```bash
npx prisma migrate deploy
# ou
npx prisma db push
```

## 🔄 Fluxo Completo

### Login

```
Usuário → /auth/login → Stack Auth → /handler → Sincroniza com DB → /dashboard
```

### Sign Up

```
Usuário → /auth/register → Stack Auth → /handler → Cria no DB → /dashboard
```

### Logout

```
Usuário clica "Sair" → user.signOut() → Redireciona para / (home)
```

## 🛡️ Proteção de Rotas

### Páginas Protegidas

O dashboard usa `useUser({ or: 'redirect' })`, que automaticamente redireciona para `/auth/login` se o usuário não estiver autenticado.

```tsx
const user = useUser({ or: 'redirect' }); // Redireciona automaticamente
```

### Middleware

O middleware (`middleware.ts`) limpa parâmetros da URL após autenticação:
- Remove `?code=xxx` do dashboard
- Permite processamento do `/handler`

## 🗄️ Sincronização de Dados

### Como Funciona

1. Usuário faz login/cadastro no Stack Auth
2. Handler recebe dados do usuário autenticado
3. Chama `syncStackAuthUser()` para:
   - Verificar se usuário existe no banco (por email)
   - Se existe: atualiza dados
   - Se não existe: cria novo registro
   - Associa StackUser com User local

### Dados Sincronizados

- Email
- Nome (displayName)
- Foto de perfil (profileImageUrl)
- ID do Stack Auth
- Username gerado automaticamente

## 📝 Migrações Necessárias

Execute antes do deploy:

```bash
# 1. Gerar cliente Prisma
npx prisma generate

# 2. Aplicar migrações
npx prisma migrate deploy

# 3. (Opcional) Se precisar criar dados iniciais
npm run db:init
```

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Domínio configurado no Stack Auth Dashboard
- [ ] Migrações do Prisma executadas
- [ ] Teste de login funcionando
- [ ] Teste de cadastro funcionando
- [ ] Teste de logout funcionando
- [ ] Teste de Google OAuth (se configurado)
- [ ] Proteção do dashboard funcionando
- [ ] URLs limpas (sem parâmetros visíveis)

## 🐛 Troubleshooting

### Erro 500 no Handler

**Causa**: Stack Auth não configurado corretamente  
**Solução**: Verificar variáveis de ambiente

### Usuário não sincroniza

**Causa**: Erro na conexão com banco de dados  
**Solução**: Verificar DATABASE_URL e executar migrations

### Redirect loop

**Causa**: Configuração incorreta das URLs  
**Solução**: Verificar URLs no `src/stack.ts`

### URL com ?code=xxx

**Causa**: Middleware não está executando  
**Solução**: Verificar `middleware.ts` e matcher config

## 📚 Arquivos Principais

```
src/
├── stack.ts                           # Configuração Stack Auth
├── lib/
│   └── stack-auth-sync.ts             # Serviço de sincronização
├── app/
│   ├── auth/
│   │   ├── login/page.tsx             # Página de login
│   │   └── register/page.tsx          # Página de registro
│   ├── dashboard/
│   │   ├── layout.tsx                 # Layout protegido
│   │   └── page.tsx                   # Dashboard principal
│   ├── handler/
│   │   └── [...stack]/page.tsx       # Handler Stack Auth
│   └── page.tsx                       # Página inicial
├── middleware.ts                      # Proteção de rotas
└── layout.tsx                         # Layout raiz com StackProvider

prisma/
└── schema.prisma                      # Schema atualizado
```

## 🎯 Resultado Final

✅ Stack Auth funcionando 100% em produção  
✅ Integração completa com Prisma/PostgreSQL  
✅ Sincronização automática de usuários  
✅ Proteção de rotas funcionando  
✅ URLs limpas após autenticação  
✅ Login, Sign Up e Logout funcionando  
✅ Google OAuth configurado (se aplicável)  
✅ Dados persistidos no banco de dados  

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs da Vercel
2. Verificar logs do Stack Auth Dashboard
3. Verificar logs do banco de dados
4. Consultar documentação do Stack Auth: https://docs.stack-auth.com/

---

**Status**: ✅ Produção - Funcionando em https://platefull.com.br

