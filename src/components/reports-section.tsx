"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { useApp } from "@/contexts/app-context";
import { SaiposSalesData } from "@/lib/saipos-api";
import { realtimeService, RealtimeUpdate } from "@/lib/realtime-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Dados mockados removidos - apenas dados reais da API Saipos

export function ReportsSection() {
  const {
    selectedStore,
    selectedPeriod,
    setSelectedPeriod,
    selectedDate,
    setSelectedDate,
    addToast,
    dashboardData,
    updateDashboardData,
    connectedAPIs
  } = useApp();

  // Função para calcular datas subtraindo dias
  const subtractDays = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
  };

  // Função para obter data de hoje no formato YYYY-MM-DD
  const getToday = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  // Estados para datas inicial e final
  const [dateStart, setDateStart] = useState<string>(getToday());
  const [dateEnd, setDateEnd] = useState<string>(getToday());

  const [salesData, setSalesData] = useState<SaiposSalesData[]>([]);
  const [dailyData, setDailyData] = useState<SaiposSalesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  
  // Cache local para evitar requisições desnecessárias (usando ref para evitar re-renders)
  const dataCacheRef = useRef<Map<string, { data: SaiposSalesData[], timestamp: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 segundos de cache

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const hoje = getToday();
    
    switch (period) {
      case "1d":
        setDateStart(hoje);
        setDateEnd(hoje);
        break;
      case "7d":
        setDateStart(subtractDays(7));
        setDateEnd(hoje);
        break;
      case "15d":
        setDateStart(subtractDays(15));
        setDateEnd(hoje);
        break;
      default:
        setDateStart(hoje);
        setDateEnd(hoje);
    }
    
    addToast(`Período alterado para ${period}`, "info");
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length > 0) {
        addToast(`Data alterada para ${date.toLocaleDateString("pt-BR")}`, "info");
        // DESABILITADO: loadDailyData causa requisições simultâneas e rate limiting
        // Os dados já são carregados via loadSalesData que busca todas as vendas
        // loadDailyData(date);
      } else {
        addToast('Conecte uma API Saipos para visualizar relatórios diários', "info");
      }
    }
  };

  // 🔹 Carregar dados do cache local usando a nova rota /api/dashboard/sales
  const loadSalesData = useCallback(async () => {
    // Validar período antes de carregar
    const startDate = new Date(dateStart);
    const endDate = new Date(dateEnd);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysDiff > 15) {
      setErrorMsg('Período máximo permitido é de 15 dias');
      addToast('Período máximo permitido é de 15 dias', 'error');
      return;
    }
    
    setIsLoading(true);
    
    // Timeout de 5 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: Carregamento demorou mais de 5 segundos')), 5000)
    );
    
    try {
      setErrorMsg(null);

      // Obter storeId da loja selecionada ou primeira conectada
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length === 0) throw new Error('Nenhuma API Saipos conectada');
      const targetApi = selectedStore?.apiId
        ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
        : saiposApis[0];

      const storeId = targetApi.name; // Usar name como storeId

      // Validar período máximo de 15 dias
      const startDateObj = new Date(dateStart);
      const endDateObj = new Date(dateEnd);
      const daysDiffCalc = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (daysDiffCalc > 15) {
        throw new Error('Período máximo permitido é de 15 dias');
      }
      
      // Calcular range baseado no período selecionado
      let range: string;
      if (daysDiffCalc <= 1) range = '1d';
      else if (daysDiffCalc <= 7) range = '7d';
      else range = '15d';

      // Verificar cache local
      const cacheKey = `${storeId}-${range}-${dateStart}-${dateEnd}`;
      const cached = dataCacheRef.current.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log("📦 Usando dados do cache local");
        setSalesData(cached.data);
        
        // Atualizar dashboard com dados do cache
        const totals = cached.data.reduce((acc: any, item: any) => ({
          totalSales: acc.totalSales + (item.totalSales || 0),
          totalOrders: acc.totalOrders + (item.totalOrders || 0),
          uniqueCustomers: acc.uniqueCustomers + (item.uniqueCustomers || 0),
        }), { totalSales: 0, totalOrders: 0, uniqueCustomers: 0 });

        const averageTicket = totals.totalOrders > 0 
          ? totals.totalSales / totals.totalOrders 
          : 0;

        updateDashboardData({
          totalSales: totals.totalSales,
          totalOrders: totals.totalOrders,
          averageTicket: averageTicket,
          uniqueCustomers: totals.uniqueCustomers,
        });
        
        setIsLoading(false);
        return;
      }

      console.log("📊 Carregando dados do cache local - storeId:", storeId, "range:", range, "período:", dateStart, "a", dateEnd);

      const fetchPromise = fetch(`/api/dashboard/sales?storeId=${encodeURIComponent(storeId)}&range=${range}`, {
        headers: { 
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
      });
      
      const res = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!res.ok) {
        throw new Error(`Erro ao buscar dados: ${res.status}`);
      }

      const resp = await res.json();
      console.log('📦 Dados recebidos do cache:', resp);

      const vendas = Array.isArray(resp?.data) ? resp.data : [];

      if (vendas.length === 0) {
        console.log('⚠️ Nenhuma venda encontrada no cache para o período');
        setSalesData([]);
        updateDashboardData({ totalSales: 0, totalOrders: 0, averageTicket: 0, uniqueCustomers: 0 });
        addToast('Sem vendas no período selecionado', 'info');
        return;
      }

      // Filtrar apenas vendas do período selecionado (dateStart a dateEnd)
      const startDateOnly = dateStart.split('T')[0];
      const endDateOnly = dateEnd.split('T')[0];
      
      const filteredByPeriod = vendas.filter((item: { date: string }) => {
        const itemDate = item.date?.split('T')[0] || item.date;
        return itemDate >= startDateOnly && itemDate <= endDateOnly;
      });

      // Converter para formato esperado pelo componente
      const normalized = filteredByPeriod.map((item: {
        date: string;
        totalSales: number;
        totalOrders: number;
        averageTicket: number;
        uniqueCustomers: number;
        channels: any;
      }) => ({
        date: item.date,
        totalSales: item.totalSales,
        totalOrders: item.totalOrders,
        averageTicket: item.averageTicket,
        uniqueCustomers: item.uniqueCustomers,
        totalRevenue: item.totalSales,
        salesByOrigin: item.channels?.salesByOrigin || [],
        ordersByChannel: item.channels?.ordersByChannel || { delivery: 0, counter: 0, hall: 0, ticket: 0 },
        topProducts: [],
      }));

      setSalesData(normalized);
      
      // Salvar no cache local
      dataCacheRef.current.set(cacheKey, { data: normalized, timestamp: Date.now() });
      // Limitar cache a 10 entradas
      if (dataCacheRef.current.size > 10) {
        const firstKey = dataCacheRef.current.keys().next().value;
        if (firstKey) {
          dataCacheRef.current.delete(firstKey);
        }
      }
      
      console.log(`📅 Período selecionado: ${startDateOnly} a ${endDateOnly}`);
      console.log(`📅 Vendas encontradas no cache: ${vendas.length}`);
      console.log(`📅 Vendas filtradas pelo período: ${filteredByPeriod.length}`);
      
      // Atualizar dashboard com os dados agregados APENAS do período selecionado
      if (filteredByPeriod.length > 0) {
        const totals = filteredByPeriod.reduce((acc: any, item: any) => ({
          totalSales: acc.totalSales + (item.totalSales || 0),
          totalOrders: acc.totalOrders + (item.totalOrders || 0),
          uniqueCustomers: acc.uniqueCustomers + (item.uniqueCustomers || 0),
        }), { totalSales: 0, totalOrders: 0, uniqueCustomers: 0 });

        const averageTicket = totals.totalOrders > 0 
          ? totals.totalSales / totals.totalOrders 
          : 0;

        updateDashboardData({
          totalSales: totals.totalSales,
          totalOrders: totals.totalOrders,
          averageTicket: averageTicket,
          uniqueCustomers: totals.uniqueCustomers,
        });
      } else {
        // Usar summary da resposta se não houver dados filtrados
        if (resp.summary) {
          updateDashboardData({
            totalSales: resp.summary.totalSales || 0,
            totalOrders: resp.summary.totalOrders || 0,
            averageTicket: resp.summary.averageTicket || 0,
            uniqueCustomers: resp.summary.uniqueCustomers || 0,
          });
        }
      }

      addToast("Dados carregados!", "success");
    } catch (error) {
      console.error("=== ERRO AO CARREGAR DADOS DO CACHE ===");
      console.error("Erro completo:", error);
      console.error("Erro message:", error instanceof Error ? error.message : String(error));
      addToast("Erro ao carregar dados do cache", "error");
      setErrorMsg(error instanceof Error ? error.message : "Erro ao carregar dados");
      setSalesData([]);
      updateDashboardData({ totalSales: 0, totalOrders: 0, averageTicket: 0, uniqueCustomers: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [dateStart, dateEnd, selectedStore, addToast, connectedAPIs, updateDashboardData]);

  // 🔹 Carregar dados diários (DESABILITADO - não usado mais, dados vêm do cache)
  // Função removida - agora usamos apenas loadSalesData que busca do cache local

  // 🔹 Efeito para carregar dados quando as datas ou loja mudarem
  useEffect(() => {
    if (selectedStore) {
      loadSalesData();
    }
  }, [dateStart, dateEnd, selectedStore, loadSalesData]);

  // 🔹 Efeito para inicializar datas quando o componente montar
  useEffect(() => {
    const hoje = getToday();
    setDateStart(hoje);
    setDateEnd(hoje);
  }, []);



  // 🔹 Configurar atualizações em tempo real
  useEffect(() => {
    if (!selectedStore) return;
    const listenerId = `realtime-${selectedStore.id}`;

    realtimeService.subscribe(listenerId, (update: RealtimeUpdate) => {
      console.log("📊 Atualização em tempo real:", update);
      switch (update.type) {
        case "sales":
          updateDashboardData({ totalSales: update.data.totalSales as number, isSyncing: true });
          break;
        case "orders":
          updateDashboardData({ totalOrders: update.data.totalOrders as number, isSyncing: true });
          break;
        case "customers":
          updateDashboardData({ uniqueCustomers: update.data.uniqueCustomers as number, isSyncing: true });
          break;
      }
      setTimeout(() => updateDashboardData({ isSyncing: false }), 2000);
    });

    // Iniciar polling a cada 60s usando cache local
    const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
    const targetApi = selectedStore?.apiId
      ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
      : saiposApis[0];
    if (targetApi && selectedStore) {
      realtimeService.startPolling(async () => {
        try {
          const storeId = targetApi.name;
          
          // Validar período máximo de 15 dias
          const startDate = new Date(dateStart);
          const endDate = new Date(dateEnd);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          if (daysDiff > 15) {
            // Manter dados atuais se período inválido
            return {
              storeId: selectedStore.id,
              type: 'sales',
              data: {
                totalSales: dashboardData.totalSales,
                totalOrders: dashboardData.totalOrders,
                averageTicket: dashboardData.averageTicket,
              },
              timestamp: new Date().toISOString(),
            } as RealtimeUpdate;
          }
          
          // Calcular range baseado no período selecionado
          let range: string;
          if (daysDiff <= 1) range = '1d';
          else if (daysDiff <= 7) range = '7d';
          else range = '15d';

          const res = await fetch(`/api/dashboard/sales?storeId=${encodeURIComponent(storeId)}&range=${range}`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });

          if (!res.ok) {
            // Tentar obter mensagem de erro da resposta
            let errorMessage = `Erro ao buscar dados: ${res.status}`;
            try {
              const errorData = await res.json().catch(() => null);
              if (errorData?.error) {
                errorMessage = errorData.error;
              }
            } catch {
              // Ignorar erro ao parsear JSON
            }
            console.error('Erro na requisição:', errorMessage);
            // Não lançar erro no polling - apenas manter dados atuais
            return {
              storeId: selectedStore.id,
              type: 'sales',
              data: {
                totalSales: dashboardData.totalSales,
                totalOrders: dashboardData.totalOrders,
                averageTicket: dashboardData.averageTicket,
              },
              timestamp: new Date().toISOString(),
            } as RealtimeUpdate;
          }

          const resp = await res.json();
          
          // Verificar se há erro na resposta
          if (resp.error) {
            console.error('Erro na resposta da API:', resp.error);
            // Manter dados atuais em caso de erro
            return {
              storeId: selectedStore.id,
              type: 'sales',
              data: {
                totalSales: dashboardData.totalSales,
                totalOrders: dashboardData.totalOrders,
                averageTicket: dashboardData.averageTicket,
              },
              timestamp: new Date().toISOString(),
            } as RealtimeUpdate;
          }
          const vendas = Array.isArray(resp?.data) ? resp.data : [];
          
          if (vendas.length === 0) {
            // Não altere os números atuais se não houver dados
            return {
              storeId: selectedStore.id,
              type: 'sales',
              data: {
                totalSales: dashboardData.totalSales,
                totalOrders: dashboardData.totalOrders,
                averageTicket: dashboardData.averageTicket,
              },
              timestamp: new Date().toISOString(),
            } as RealtimeUpdate;
          }

          // Filtrar pelo período selecionado
          const startDateOnly = dateStart.split('T')[0];
          const endDateOnly = dateEnd.split('T')[0];
          const filteredByPeriod = vendas.filter((item: { date: string }) => {
            const itemDate = item.date?.split('T')[0] || item.date;
            return itemDate >= startDateOnly && itemDate <= endDateOnly;
          });

          const totals = filteredByPeriod.reduce((acc: any, item: any) => ({
            totalSales: acc.totalSales + (item.totalSales || 0),
            totalOrders: acc.totalOrders + (item.totalOrders || 0),
            uniqueCustomers: acc.uniqueCustomers + (item.uniqueCustomers || 0),
          }), { totalSales: 0, totalOrders: 0, uniqueCustomers: 0 });
          
          const averageTicket = totals.totalOrders > 0 ? totals.totalSales / totals.totalOrders : 0;

          return {
            storeId: selectedStore.id,
            type: 'sales',
            data: { 
              totalSales: totals.totalSales, 
              totalOrders: totals.totalOrders, 
              averageTicket,
              uniqueCustomers: totals.uniqueCustomers,
            },
            timestamp: new Date().toISOString(),
          } as RealtimeUpdate;
        } catch (error) {
          console.error('Erro no polling de dados de vendas:', error);
          // Não zerar: manter números atuais
          return {
            storeId: selectedStore.id,
            type: 'sales',
            data: {
              totalSales: dashboardData.totalSales,
              totalOrders: dashboardData.totalOrders,
              averageTicket: dashboardData.averageTicket,
            },
            timestamp: new Date().toISOString(),
          } as RealtimeUpdate;
        }
      }, 60000);
    }

    return () => {
      realtimeService.unsubscribe(listenerId);
      realtimeService.stopPolling();
    };
  }, [selectedStore, updateDashboardData, connectedAPIs, dateStart, dateEnd, dashboardData.totalSales, dashboardData.totalOrders, dashboardData.averageTicket]);

  // ✅ Memo para evitar loop infinito
  const chartData = useMemo(() => {
  if (!Array.isArray(salesData)) return [];
  return salesData.map((item: SaiposSalesData) => ({
    name: format(new Date(item.date), 'dd/MM'),
    vendas: item.totalSales,
    pedidos: item.totalOrders
  }));
}, [salesData]); // ✅ DEPENDÊNCIA OBRIGATÓRIA

  const stats = [
    {
      title: "Vendas Hoje",
      value: `R$ ${dashboardData.totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
      isSyncing: dashboardData.isSyncing
    },
    {
      title: "Pedidos Hoje",
      value: dashboardData.totalOrders.toString(),
      change: "+8.2%",
      changeType: "positive" as const,
      icon: ShoppingCart,
      isSyncing: dashboardData.isSyncing
    },
    {
      title: "Ticket Médio",
      value: `R$ ${dashboardData.averageTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      change: "-2.1%",
      changeType: "negative" as const,
      icon: TrendingUp,
      isSyncing: dashboardData.isSyncing
    },
    {
      title: "Clientes Únicos",
      value: dashboardData.uniqueCustomers.toString(),
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Users,
      isSyncing: dashboardData.isSyncing
    }
  ];

  const saiposApisConnected = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-gray-400">
            {selectedStore
              ? `Acompanhe o desempenho da ${selectedStore.name}`
              : "Acompanhe o desempenho do seu negócio"}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Última atualização: {new Date(dashboardData.lastUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Seletores de Data */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Data Inicial</label>
              <input
                type="date"
                value={dateStart}
                max={getToday()}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  const startDate = new Date(newStartDate);
                  const endDate = new Date(dateEnd);
                  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  if (daysDiff > 15) {
                    addToast('Período máximo permitido é de 15 dias', 'error');
                    // Ajustar data final automaticamente
                    const maxEndDate = new Date(startDate);
                    maxEndDate.setDate(maxEndDate.getDate() + 14);
                    if (maxEndDate <= new Date()) {
                      setDateEnd(maxEndDate.toISOString().split('T')[0]);
                    }
                  }
                  
                  if (startDate > endDate) {
                    addToast('Data inicial deve ser menor ou igual à data final', 'error');
                    return;
                  }
                  
                  setDateStart(newStartDate);
                }}
                className="px-3 py-2 bg-[#141415] border border-[#374151] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#001F05]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Data Final</label>
              <input
                type="date"
                value={dateEnd}
                max={getToday()}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  const startDate = new Date(dateStart);
                  const endDate = new Date(newEndDate);
                  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  if (daysDiff > 15) {
                    addToast('Período máximo permitido é de 15 dias', 'error');
                    return;
                  }
                  
                  if (endDate < startDate) {
                    addToast('Data final deve ser maior ou igual à data inicial', 'error');
                    return;
                  }
                  
                  setDateEnd(newEndDate);
                }}
                className="px-3 py-2 bg-[#141415] border border-[#374151] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#001F05]"
              />
            </div>
          </div>

          {/* Botões de Filtro Rápido */}
          <div className="flex bg-[#141415] rounded-lg p-1">
            <Button
              variant={selectedPeriod === "1d" ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange("1d")}
              className={`${
                selectedPeriod === "1d"
                  ? "bg-[#001F05] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              1D
            </Button>
            <Button
              variant={selectedPeriod === "7d" ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange("7d")}
              className={`${
                selectedPeriod === "7d"
                  ? "bg-[#001F05] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              7D
            </Button>
            <Button
              variant={selectedPeriod === "15d" ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange("15d")}
              className={`${
                selectedPeriod === "15d"
                  ? "bg-[#001F05] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              15D
            </Button>
          </div>

          <Dialog open={waOpen} onOpenChange={setWaOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!salesData.length}
                className="bg-[#141415] border-[#374151] text-white hover:bg-[#374151]"
              >
                Enviar WhatsApp
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#141415] border-[#374151] text-white">
              <DialogHeader>
                <DialogTitle>Enviar relatório por WhatsApp</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Informe o número em formato DDI+DDD+número. Ex: 5592987654321
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <input
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="Número do WhatsApp"
                  className="w-full p-2 rounded-md bg-[#0f0f10] border border-[#374151] text-white"
                />
                <div className="text-xs text-gray-400">
                  A mensagem incluirá a loja, período e totais do relatório atual.
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    const startDate = new Date(dateStart);
                    const endDate = new Date(dateEnd);
                    const msg = `Relatório ${selectedStore ? selectedStore.name : ''} (${selectedPeriod})\n` +
                      `Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}\n` +
                      `Vendas: R$ ${dashboardData.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `Pedidos: ${dashboardData.totalOrders}\n` +
                      `Ticket médio: R$ ${dashboardData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `Clientes únicos: ${dashboardData.uniqueCustomers}`;
                    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
                    if (typeof window !== 'undefined') window.open(url, '_blank');
                  }}
                  disabled={!waPhone.trim()}
                  className="bg-[#001F05]"
                >
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-[#141415] border-[#374151] text-white hover:bg-[#374151]"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                  : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#141415] border-[#374151]" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                initialFocus
                className="bg-[#141415] text-white"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Alertas e estados */}
      {!saiposApisConnected.length && (
        <Alert variant="destructive">
          <AlertTitle>Sem conexão com a Saipos</AlertTitle>
          <AlertDescription>
            Conecte sua loja Saipos para visualizar relatórios.
          </AlertDescription>
        </Alert>
      )}

      {errorMsg && saiposApisConnected.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="text-gray-400 text-sm">Carregando...</div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className={`bg-[#141415] border-[#374151] transition-all duration-300 ${
              stat.isSyncing ? "ring-2 ring-[#001F05]/50 bg-[#001F05]/5" : ""
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <stat.icon
                      className={`h-8 w-8 text-[#001F05] mb-2 ${
                        stat.isSyncing ? "animate-pulse" : ""
                      }`}
                    />
                    {stat.isSyncing && (
                      <RefreshCw className="h-4 w-4 text-[#001F05] animate-spin" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === "positive" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 🔹 Breakdown por Canal/Origem */}
      {dailyData && dailyData.salesByOrigin && dailyData.salesByOrigin.length > 0 && (
        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader>
            <CardTitle className="text-white">📊 Vendas por Canal</CardTitle>
            <CardDescription className="text-gray-400">
              Breakdown de vendas por origem (iFood, Telefone, Delivery Direto, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyData.salesByOrigin.map((channel, index) => (
                <div
                  key={index}
                  className="bg-[#0f0f10] p-4 rounded-lg border border-[#374151] hover:border-[#001F05] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-white font-semibold text-lg">{channel.origin}</p>
                    <span className="text-xs text-gray-500 bg-[#374151] px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-sm">
                      Pedidos: <span className="text-white font-medium">{channel.quantity}</span>
                    </p>
                    <p className="text-gray-400 text-sm">
                      Receita: <span className="text-green-400 font-bold">R$ {channel.revenue.toFixed(2)}</span>
                    </p>
                    {channel.quantity > 0 && (
                      <p className="text-gray-500 text-xs">
                        Ticket médio: R$ {(channel.revenue / channel.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#374151]">
              <p className="text-gray-400 text-sm text-center">
                Total: <span className="text-white font-bold">{dailyData.salesByOrigin.reduce((sum, c) => sum + c.quantity, 0)} pedidos</span> | 
                <span className="text-green-400 font-bold ml-1">R$ {dailyData.salesByOrigin.reduce((sum, c) => sum + c.revenue, 0).toFixed(2)}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🔹 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader>
            <CardTitle className="text-white">Vendas dos Últimos 6 Meses</CardTitle>
            <CardDescription className="text-gray-400">
              Evolução das vendas e número de pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#141415",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#white"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="vendas"
                  stroke="#001F05"
                  strokeWidth={3}
                  dot={{ fill: "#001F05", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader>
            <CardTitle className="text-white">Pedidos por Hora (Hoje)</CardTitle>
            <CardDescription className="text-gray-400">
              Distribuição de pedidos ao longo do dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={
                  dailyData
                    ? dailyData.topProducts.map((product) => ({
                        hora: product.name.substring(0, 8) + "...",
                        pedidos: product.quantity
                      }))
                    : []
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hora" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#141415",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#white"
                  }}
                />
                <Bar dataKey="pedidos" fill="#001F05" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}