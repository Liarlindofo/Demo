'use client';

import { SignIn } from '@stackframe/stack';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const devAuthBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

  // Se estiver em modo bypass, redirecionar direto para o dashboard
  useEffect(() => {
    if (devAuthBypass) {
      router.push('/dashboard');
    }
  }, [devAuthBypass, router]);

  if (devAuthBypass) {
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