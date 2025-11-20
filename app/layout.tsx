import type { Metadata } from 'next';
import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackServerApp } from '@/stack';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { GlobalErrorHandler } from '@/components/global-error-handler';
import { ErrorBoundary } from '@/components/error-boundary';

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
  
  return (
    <html lang="pt-BR" className="dark">
      <body className={bodyClasses}>
        <ErrorBoundary>
          <StackProvider app={stackServerApp}>
            <StackTheme>
              <GlobalErrorHandler />
              {children}
            </StackTheme>
          </StackProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}