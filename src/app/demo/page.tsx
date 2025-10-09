"use client";

import { StoreCarousel } from "@/components/store-carousel";
import { ReportsSection } from "@/components/reports-section";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { Button } from "@/components/ui/button";
import { APIConnectionDialog } from "@/components/api-connection-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, User, Moon, Sun, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-[#141415] border-b border-[#374151] px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white hover:text-[#001F05] transition-colors">
            Drin
          </Link>

          {/* Right side - User menu and settings */}
          <div className="flex items-center gap-4">
            {/* Back to Home */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-[#374151]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>

            {/* API Connection Menu */}
            <APIConnectionDialog />

            {/* User Avatar Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="User" />
                    <AvatarFallback className="bg-[#001F05] text-white">D</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#141415] border-[#374151] text-white">
                <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]">
                  <User className="mr-2 h-4 w-4" />
                  Personalizar perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]">
                  <Moon className="mr-2 h-4 w-4" />
                  Modo escuro
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151] text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="bg-[#001F05] border-b border-[#001F05]/20 px-6 py-3">
        <div className="flex items-center justify-center">
          <p className="text-white text-sm font-medium">
            🎯 <strong>Modo Demonstração</strong> - Explore todas as funcionalidades do dashboard
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen bg-black">
        {/* Store Carousel */}
        <StoreCarousel />
        
        {/* Reports Section */}
        <ReportsSection />
        
        {/* WhatsApp Button */}
        <WhatsAppButton />
      </div>
    </div>
  );
}

