"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Settings, User, Moon, Sun, LogOut } from "lucide-react";
import { APIConnectionDialog } from "@/components/api-connection-dialog";
import { Logo } from "@/components/logo";
import { AppProvider } from "@/contexts/app-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Aqui você implementaria a lógica para alternar o tema
  };

  return (
    <AppProvider>
      <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="bg-black text-white min-h-screen">
          {/* Header */}
          <header className="bg-[#141415] border-b border-[#374151] px-6 py-4">
            <div className="flex items-center justify-center relative">
              {/* Left side - API Connection Menu */}
              <div className="absolute left-0 flex items-center gap-4">
                <APIConnectionDialog />
              </div>

              {/* Logo centralizada */}
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Logo />
              </Link>

              {/* Right side - User menu and settings */}
              <div className="absolute right-0 flex items-center gap-4">
                {/* User Avatar Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/01.png" alt="User" />
                        <AvatarFallback className="bg-[#001F05] text-white">U</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#141415] border-[#374151] text-white">
                    <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]">
                      <User className="mr-2 h-4 w-4" />
                      Personalizar perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="hover:bg-[#374151] focus:bg-[#374151]"
                      onClick={toggleDarkMode}
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

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
