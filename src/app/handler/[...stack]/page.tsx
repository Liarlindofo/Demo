import { StackHandler } from '@stackframe/stack';
import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import { syncStackAuthUser } from '@/lib/stack-auth-sync';

export default async function Handler(props: {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  try {
    // Verificar se o usuário acabou de fazer login
    const user = await stackServerApp.getUser();
    
    if (user) {
      // Sincronizar com banco de dados local
      await syncStackAuthUser({
        id: user.id,
        primaryEmail: user.primaryEmail,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
        primaryEmailVerified: user.primaryEmailVerified,
      });
      
      // Redirecionar para o dashboard após sincronização
      redirect('/dashboard');
    }
    
    return <StackHandler fullPage {...props} />;
  } catch (error) {
    console.error('Erro no handler do Stack Auth:', error);
    return <StackHandler fullPage {...props} />;
  }
}