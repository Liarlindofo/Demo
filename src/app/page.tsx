"use client";

import { MinimalistBackground } from "@/components/background-paper-shaders";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Minimalist Shader Background */}
      <MinimalistBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          {/* Main Text */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
            Um novo universo para o seu negócio começa aqui
          </h1>

          {/* CTA Button */}
          <div className="pt-6 flex justify-center">
            <Link href="/auth/login">
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
