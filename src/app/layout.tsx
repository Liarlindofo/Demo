import type { Metadata } from 'next';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackServerApp } from '../stack';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Drin - Plataforma de Relatorios',
  description: 'Um novo universo para o seu negocio comeca aqui',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bodyClasses = [geistSans.variable, geistMono.variable, 'antialiased'].join(' ');
  
  // Modo de bypass em desenvolvimento
  const devAuthBypass = process.env.DEV_AUTH_BYPASS === 'true';
  
  return (
    <html lang="pt-BR" className="dark">
      <body className={bodyClasses}>
        {devAuthBypass ? (
          // Modo bypass - sem autenticação real
          children
        ) : (
          // Modo normal com Stack Auth
          <StackProvider app={stackServerApp}>
            <StackTheme>
              {children}
            </StackTheme>
          </StackProvider>
        )}
      </body>
    </html>
  );
}