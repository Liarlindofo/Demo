"use client";

import { MinimalistBackground } from "@/components/background-paper-shaders";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <MinimalistBackground />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
            Um novo universo para o seu negocio comeca aqui
          </h1>

          <div className="pt-6 flex justify-center">
            <Link href="/dashboard">
              <Button 
                size="lg" 
                className="bg-[#001F05] hover:bg-[#001F05]/80 text-white px-12 py-4 text-base font-semibold rounded-full transition-all duration-300 hover:scale-105 shadow-lg border border-[#001F05]/20"
              >
                Entrar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
