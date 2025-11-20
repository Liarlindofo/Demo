'use client';

import { AppProvider } from '@/contexts/app-context';
import { useUser } from '@stackframe/stack';

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  const user = useUser({ or: 'redirect' });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Carregando...
      </div>
    );
  }

  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}


