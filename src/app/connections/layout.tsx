'use client';

import { AppProvider } from '@/contexts/app-context';

export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}


