"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  avatar: string;
  status: "connected" | "disconnected";
  lastSync?: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface AppContextType {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  isDarkMode: boolean;
  setIsDarkMode: (darkMode: boolean) => void;
  toasts: Toast[];
  addToast: (message: string, type: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Aplicar tema ao documento
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <AppContext.Provider value={{
      selectedStore,
      setSelectedStore,
      selectedPeriod,
      setSelectedPeriod,
      selectedDate,
      setSelectedDate,
      isDarkMode,
      setIsDarkMode,
      toasts,
      addToast,
      removeToast
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
