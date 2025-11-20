'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser } from '@stackframe/stack';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, User, Moon, Sun, LogOut, MessageCircle, MessageSquare } from 'lucide-react';
import { Logo } from '@/components/logo';
import { AppProvider } from '@/contexts/app-context';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Usar Stack Auth real - redireciona para login se não autenticado
  const user = useUser({ or: 'redirect' });
  
  const router = useRouter();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = async () => {
    if (user?.signOut) {
      await user.signOut();
    }
    router.push('/');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <AppProvider>
      <div className={isDarkMode ? 'min-h-screen dark' : 'min-h-screen'}>
        <div className="bg-black text-white min-h-screen">
          <header className="bg-[#141415] border-b border-[#374151] px-6 py-4">
            <div className="flex items-center justify-center relative">
              <div className="absolute left-0 flex items-center gap-4">
                <Link href="/connections">
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-green-500 hover:text-green-400 hover:bg-green-500/10">
                    Conexões Saipos
                  </Button>
                </Link>
                <Link href="/whatsapp-config">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10" title="Configurar WhatsApp Business">
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/whatsapp-tools">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10" title="Ferramentas WhatsApp">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Logo />
              </Link>
              <div className="absolute right-0 flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl || '/avatars/01.png'} alt={user.displayName || 'User'} />
                        <AvatarFallback className="bg-[#001F05] text-white">
                          {user.displayName?.charAt(0)?.toUpperCase() || user.primaryEmail?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#141415] border-[#374151] text-white">
                    <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]">
                      <User className="mr-2 h-4 w-4" />
                      {user.displayName || 'Usuario'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151] text-xs text-gray-400">
                      {user.primaryEmail}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]" onClick={toggleDarkMode}>
                      {isDarkMode ? (<><Sun className="mr-2 h-4 w-4" />Modo claro</>) : (<><Moon className="mr-2 h-4 w-4" />Modo escuro</>)}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151]">
                      <Settings className="mr-2 h-4 w-4" />
                      Configuracoes
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-[#374151] focus:bg-[#374151] text-red-400" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}