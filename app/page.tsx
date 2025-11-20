"use client";

import { MinimalistBackground } from "@/components/background-paper-shaders";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from '@stackframe/stack';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const user = useUser({ or: 'return-null' });
  const router = useRouter();

  useEffect(() => {
    // Se o usuário já está autenticado, redirecionar para o dashboard
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Se já está autenticado, mostrar loading enquanto redireciona
  if (user) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        <MinimalistBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-white">Redirecionando...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <MinimalistBackground />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
            Um novo universo para o seu negocio comeca aqui
          </h1>

          <div className="pt-6 flex justify-center gap-4">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="bg-[#001F05] hover:bg-[#001F05]/80 text-white px-12 py-4 text-base font-semibold rounded-full transition-all duration-300 hover:scale-105 shadow-lg border border-[#001F05]/20"
              >
                Entrar
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button 
                size="lg" 
                variant="outline"
                className="border-[#001F05]/50 text-white hover:bg-[#001F05]/20 px-12 py-4 text-base font-semibold rounded-full transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
