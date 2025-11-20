'use client';

import { SignIn, useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const user = useUser({ or: 'return-null' });

  useEffect(() => {
    // Se o usuário já está autenticado, redirecionar para o dashboard
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Se já está autenticado, mostrar loading enquanto redireciona
  if (user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-white">Redirecionando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <SignIn />
    </div>
  );
}
