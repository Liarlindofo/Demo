import { StackHandler } from '@stackframe/stack';
import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import { syncStackAuthUser } from '@/lib/stack-auth-sync';

import type { JSX } from 'react';

export default async function Handler(props: Record<string, unknown>): Promise<JSX.Element> {
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