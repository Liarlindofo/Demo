import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import { syncStackAuthUser } from '@/lib/stack-auth-sync';

/**
 * Handler do Stack Auth como Page Component
 * Este é o componente que o Stack Auth usa para renderizar páginas de autenticação
 * 
 * No Next.js 15, params e searchParams são Promises, então precisamos await them
 */
export default async function Handler(props: {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  try {
    // Aguardar os params e searchParams (Next.js 15 requer isso)
    const params = await props.params;
    const searchParams = await props.searchParams;
    
    // Verificar se o usuário acabou de fazer login (depois que o StackHandler processar)
    // Fazemos isso em background para não bloquear a renderização
    stackServerApp.getUser().then(async (user) => {
      if (user) {
        try {
          // Sincronizar com banco de dados local
          await syncStackAuthUser({
            id: user.id,
            primaryEmail: user.primaryEmail,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
            primaryEmailVerified: user.primaryEmailVerified 
              ? new Date() 
              : null,
          });
        } catch (syncError) {
          // Log do erro mas não falhar o handler
          console.error('Erro ao sincronizar usuário:', syncError);
        }
      }
    }).catch((err) => {
      // Ignorar erros de verificação em background
      console.error('Erro ao verificar usuário para sincronização:', err);
    });
    
    // Renderizar o StackHandler com a propriedade app obrigatória
    return (
      <StackHandler
        app={stackServerApp}
        routeProps={{ params, searchParams }}
        fullPage={true}
      />
    );
  } catch (error) {
    console.error('Erro no handler do Stack Auth:', error);
    // Em caso de erro, ainda renderizar o handler para permitir que o Stack Auth tente processar
    const params = await props.params;
    const searchParams = await props.searchParams;
    return (
      <StackHandler
        app={stackServerApp}
        routeProps={{ params, searchParams }}
        fullPage={true}
      />
    );
  }
}

