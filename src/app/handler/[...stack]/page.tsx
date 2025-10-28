import { StackHandler } from '@stackframe/stack';
import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import { syncStackAuthUser } from '@/lib/stack-auth-sync';

interface HandlerProps {
  params: Record<string, string | string[]>;
  searchParams: Record<string, string | string[]>;
}

export default async function Handler({ params, searchParams }: HandlerProps) {
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
    
    return <StackHandler fullPage params={params} searchParams={searchParams} />;
  } catch (error) {
    console.error('Erro no handler do Stack Auth:', error);
    return <StackHandler fullPage params={params} searchParams={searchParams} />;
  }
}