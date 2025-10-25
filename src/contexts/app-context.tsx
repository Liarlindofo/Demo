"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

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
  apiKey?: string;
  baseUrl?: string;
  lastTest?: string;
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
  userId: string | null;
  setUserId: (userId: string | null) => void;
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
  loadUserAPIs: () => Promise<void>;
  createUserAPI: (data: { name: string; type: 'saipos' | 'custom' | 'whatsapp'; apiKey: string; baseUrl?: string }) => Promise<void>;
  updateUserAPI: (apiId: string, data: Partial<API>) => Promise<void>;
  deleteUserAPI: (apiId: string) => Promise<void>;
  testUserAPI: (apiId: string) => Promise<void>;
  dashboardData: DashboardData;
  setDashboardData: (data: DashboardData) => void;
  updateDashboardData: (updates: Partial<DashboardData>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Usar um userId fixo para teste, sem necessidade de login
  const [userId, setUserId] = useState<string | null>("test-user-123");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [connectedAPIs, setConnectedAPIs] = useState<API[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    uniqueCustomers: 0,
    lastUpdate: new Date().toISOString(),
    isSyncing: false
  });

  // Aplicar tema ao documento
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  // Carregar APIs do usuário do banco de dados
  const loadUserAPIs = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/user-apis?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const apis: API[] = data.apis.map((api: any) => ({
          id: api.id,
          name: api.name,
          type: api.type,
          status: api.status,
          apiKey: api.apiKey,
          baseUrl: api.baseUrl,
          lastTest: api.lastTest
        }));
        setConnectedAPIs(apis);
        console.log('📱 APIs carregadas do banco de dados:', apis);
      }
    } catch (error) {
      console.error('Erro ao carregar APIs do banco:', error);
      addToast('Erro ao carregar configurações das APIs', 'error');
    }
  }, [userId, addToast]);

  // Carregar APIs quando o userId mudar
  useEffect(() => {
    if (userId) {
      loadUserAPIs();
    } else {
      setConnectedAPIs([]);
    }
  }, [userId, loadUserAPIs]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateDashboardData = useCallback((updates: Partial<DashboardData>) => {
    setDashboardData(prev => ({
      ...prev,
      ...updates,
      lastUpdate: new Date().toISOString()
    }));
  }, []);

  // Criar nova API
  const createUserAPI = useCallback(async (data: { name: string; type: 'saipos' | 'custom' | 'whatsapp'; apiKey: string; baseUrl?: string }) => {
    if (!userId) {
      addToast('Usuário não identificado', 'error');
      return;
    }

    try {
      const response = await fetch('/api/user-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...data
        })
      });

      if (response.ok) {
        addToast(`API ${data.name} criada com sucesso!`, 'success');
        await loadUserAPIs(); // Recarregar lista
      } else {
        addToast('Erro ao criar API', 'error');
      }
    } catch (error) {
      console.error('Erro ao criar API:', error);
      addToast('Erro ao criar API', 'error');
    }
  }, [userId, addToast, loadUserAPIs]);

  // Atualizar API
  const updateUserAPI = useCallback(async (apiId: string, data: Partial<API>) => {
    try {
      const response = await fetch(`/api/user-apis?id=${apiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        addToast('API atualizada com sucesso!', 'success');
        await loadUserAPIs(); // Recarregar lista
      } else {
        addToast('Erro ao atualizar API', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar API:', error);
      addToast('Erro ao atualizar API', 'error');
    }
  }, [addToast, loadUserAPIs]);

  // Deletar API
  const deleteUserAPI = useCallback(async (apiId: string) => {
    try {
      const response = await fetch(`/api/user-apis?id=${apiId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        addToast('API removida com sucesso!', 'success');
        await loadUserAPIs(); // Recarregar lista
      } else {
        addToast('Erro ao remover API', 'error');
      }
    } catch (error) {
      console.error('Erro ao deletar API:', error);
      addToast('Erro ao remover API', 'error');
    }
  }, [addToast, loadUserAPIs]);

  // Testar API
  const testUserAPI = useCallback(async (apiId: string) => {
    try {
      const response = await fetch(`/api/user-apis/test?id=${apiId}`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        addToast(`Teste concluído: ${data.api.status}`, data.api.status === 'connected' ? 'success' : 'error');
        await loadUserAPIs(); // Recarregar lista
      } else {
        addToast('Erro ao testar API', 'error');
      }
    } catch (error) {
      console.error('Erro ao testar API:', error);
      addToast('Erro ao testar API', 'error');
    }
  }, [addToast, loadUserAPIs]);

  return (
    <AppContext.Provider value={{
      userId,
      setUserId,
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
      loadUserAPIs,
      createUserAPI,
      updateUserAPI,
      deleteUserAPI,
      testUserAPI,
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
