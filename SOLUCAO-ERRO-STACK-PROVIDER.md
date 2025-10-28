# Solução do Erro: useStackApp must be used within a StackProvider

## Problema
O erro ocorria porque os componentes `<SignIn />` e `<SignUp />` foram renderizados fora do contexto do `StackProvider`.

## Causa
O `StackProvider` estava sendo condicionalmente removido quando `DEV_AUTH_BYPASS=true`, mas as páginas de autenticação ainda tentavam usar componentes que requerem esse provider.

## Solução Implementada

### 1. `src/app/layout.tsx`
- **Antes**: StackProvider era removido em modo bypass
- **Depois**: StackProvider sempre renderizado

```tsx
// ANTES (causava erro)
{devAuthBypass ? children : <StackProvider>...</StackProvider>}

// DEPOIS (funciona sempre)
<StackProvider app={stackServerApp}>
  <StackTheme>
    {children}
  </StackTheme>
</StackProvider>
```

### 2. Páginas de Autenticação (`login/page.tsx` e `register/page.tsx`)
- Adicionada verificação de modo bypass **antes** de renderizar componentes Stack Auth
- Redirecionamento imediato em modo bypass

```tsx
useEffect(() => {
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
  if (bypass) {
    router.push('/dashboard');
  }
}, [router]);

// Só renderiza SignIn se não estiver em bypass
if (devAuthBypass) {
  return <div>Redirecionando...</div>;
}

return <SignIn />;
```

### 3. Página Inicial (`page.tsx`)
- Verificação de modo bypass feita no cliente (useState + useEffect)
- Evita renderização inconsistente entre servidor e cliente

## Como Usar

### Modo Normal (com Stack Auth)
```env
# .env.local
NEXT_PUBLIC_DEV_AUTH_BYPASS=false
NEXT_PUBLIC_STACK_PROJECT_ID=seu-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=sua-key
STACK_SECRET_SERVER_KEY=sua-secret-key
```

### Modo Bypass (desenvolvimento sem autenticação)
```env
# .env.local
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
```

## Resultado
- ✅ Sem erros de StackProvider
- ✅ Componentes Stack Auth funcionam corretamente
- ✅ Modo bypass funciona para desenvolvimento
- ✅ Redirecionamentos funcionam corretamente
- ✅ Sem parâmetros visíveis na URL (middleware)

