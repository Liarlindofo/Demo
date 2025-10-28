# Setup de Produção - Drin Platform

## ⚡ Comandos Necessários ANTES do Deploy

### 1. Gerar Cliente Prisma
```bash
npx prisma generate
```

### 2. Aplicar Migrações do Banco
```bash
npx prisma migrate deploy
```

Ou se for a primeira vez:
```bash
npx prisma db push
```

### 3. Inicializar Dados (Opcional)
```bash
npm run db:init
```

## 📋 Checklist de Configuração

### Stack Auth Dashboard
1. ✅ Adicione `https://platefull.com.br` em **Trusted Domains**
2. ✅ Configure as URLs de callback
3. ✅ Ative Google OAuth (se desejado)

### Vercel - Variáveis de Ambiente
Configure todas estas variáveis no painel da Vercel:

```env
NEXT_PUBLIC_STACK_PROJECT_ID=sua-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=sua-publishable-key
STACK_SECRET_SERVER_KEY=sua-secret-key
NEXT_PUBLIC_BASE_URL=https://platefull.com.br
DATABASE_URL=sua-database-url
```

## 🚀 Deploy

### 1. Commit e Push
```bash
git add .
git commit -m "feat: integração completa Stack Auth + Prisma"
git push origin main
```

### 2. Vercel fará deploy automaticamente
A Vercel irá:
- Instalar dependências
- Executar `prisma generate`
- Executar `vercel-build` (que inclui prisma generate)
- Fazer build do Next.js
- Deploy para produção

## ✅ Testes Após Deploy

1. Acesse: https://platefull.com.br
2. Clique em "Cadastrar"
3. Preencha o formulário ou use Google OAuth
4. Deve redirecionar para /dashboard
5. Verifique no banco de dados se o usuário foi criado

## 🔍 Verificação

### 1. Verificar Usuários no Banco
```sql
SELECT * FROM users;
SELECT * FROM stack_users;
```

### 2. Verificar Logs
- Vercel Dashboard → Functions → View Logs
- Stack Auth Dashboard → Logs

### 3. Testar Fluxo Completo
1. Login
2. Cadastro
3. Logout
4. Proteção do dashboard (sem login)
5. Google OAuth (se configurado)

## 🐛 Problemas Comuns

### "Redirect URL not whitelisted"
**Solução**: Adicione o domínio em Trusted Domains no Stack Auth Dashboard

### "Invalid client key"
**Solução**: Verifique as variáveis de ambiente na Vercel

### "Database connection error"
**Solução**: Verifique DATABASE_URL e execute `prisma db push`

### Erro 500 no handler
**Solução**: Verifique logs da Vercel e variáveis de ambiente

## 📊 Status Final

✅ Stack Auth integrado  
✅ Prisma configurado  
✅ Handler funcionando  
✅ Sincronização de usuários ativa  
✅ Proteção de rotas ativa  
✅ URLs limpas funcionando  
✅ Modo bypass removido  
✅ Pronto para produção  

## 📞 Próximos Passos

1. Fazer commit das mudanças
2. Push para o repositório
3. Aguardar deploy automático da Vercel
4. Testar em produção
5. Monitorar logs
6. Ajustar se necessário

---

**🎉 Seu sistema está pronto para produção!**

