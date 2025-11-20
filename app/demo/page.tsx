"use client";

import { useState } from "react";
import { StoreCarousel } from "@/components/store-carousel";
import { ReportsSection } from "@/components/reports-section";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { Button } from "@/components/ui/button";
import { APIConnectionDialog } from "@/components/api-connection-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, User, Moon, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { AppProvider, useApp } from "@/contexts/app-context";
import { ToastManager } from "@/components/notification-toast";
import { ProfileEditModal } from "@/components/profile-edit-modal";

function DemoPageContent() {
  const { isDarkMode, setIsDarkMode, addToast, toasts, removeToast } = useApp();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    addToast("Logout realizado com sucesso!", "success");
    // Redirecionar para a página de login após um pequeno delay
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 1500);
  };

  const handleProfileCustomization = () => {
    setIsProfileModalOpen(true);
  };

  const handleSettings = () => {
    addToast("Abrindo configurações...", "info");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-[#141415] border-b border-[#374151] px-6 py-4">
        <div className="flex items-center justify-center relative">
          {/* Left side - Three lines menu and WhatsApp logo */}
          <div className="absolute left-0 flex items-center gap-4">
            <APIConnectionDialog />
            {/* WhatsApp Logo */}
            <button 
              onClick={() => window.open('/whatsapp-config', '_blank')}
              className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
              title="Configurar WhatsApp para relatórios"
            >
              <Image 
                src="/whatsapp-logo.svg" 
                alt="WhatsApp" 
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </button>
          </div>

          {/* Logo centralizada */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>

          {/* Right side - User menu */}
          <div className="absolute right-0 flex items-center gap-4">
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
                <DropdownMenuItem 
                  className="hover:bg-[#374151] focus:bg-[#374151] cursor-pointer"
                  onClick={handleProfileCustomization}
                >
                  <User className="mr-2 h-4 w-4" />
                  Personalizar perfil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-[#374151] focus:bg-[#374151] cursor-pointer"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      Modo claro
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      Modo escuro
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-[#374151] focus:bg-[#374151] cursor-pointer"
                  onClick={handleSettings}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-[#374151] focus:bg-[#374151] text-red-400 cursor-pointer"
                  onClick={handleLogout}
                >
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
      
      {/* Toast Notifications */}
      <ToastManager 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
      
      {/* Profile Edit Modal */}
      <ProfileEditModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function DemoPage() {
  return (
    <AppProvider>
      <DemoPageContent />
    </AppProvider>
  );
}

