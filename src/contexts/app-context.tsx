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

interface API {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  type: "saipos" | "custom" | "whatsapp";
}

interface DashboardData {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  uniqueCustomers: number;
  lastUpdate: string;
  isSyncing: boolean;
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
  connectedAPIs: API[];
  setConnectedAPIs: (apis: API[]) => void;
  dashboardData: DashboardData;
  setDashboardData: (data: DashboardData) => void;
  updateDashboardData: (updates: Partial<DashboardData>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [connectedAPIs, setConnectedAPIs] = useState<API[]>([
    {
      id: "saipos-1",
      name: "PDV Principal",
      status: "connected",
      type: "saipos"
    },
    {
      id: "saipos-2",
      name: "PDV Secundário",
      status: "connected",
      type: "saipos"
    }
  ]);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 2450,
    totalOrders: 47,
    averageTicket: 52.13,
    uniqueCustomers: 23,
    lastUpdate: new Date().toISOString(),
    isSyncing: false
  });

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

  const updateDashboardData = (updates: Partial<DashboardData>) => {
    setDashboardData(prev => ({
      ...prev,
      ...updates,
      lastUpdate: new Date().toISOString()
    }));
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
      removeToast,
      connectedAPIs,
      setConnectedAPIs,
      dashboardData,
      setDashboardData,
      updateDashboardData
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
