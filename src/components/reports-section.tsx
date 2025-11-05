"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { saiposHTTP, SaiposSalesData, normalizeSalesResponse, normalizeDailyResponse } from "@/lib/saipos-api";
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

  // Converter data local (YYYY-MM-DD) para intervalo considerando 17:00–23:30 BR (-03:00)
  const formatSaiposDate = useCallback((date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}-03:00`;
  }, []);

  const getSaiposRange = useCallback((dateString: string): { start: string; end: string } => {
    // start = dataInicial + T17:00:00-03:00
    const start = `${dateString}T17:00:00-03:00`;
    
    // end = dataFinal + T03:30:00-03:00 + 1 dia
    const date = new Date(`${dateString}T03:30:00-03:00`);
    date.setDate(date.getDate() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const end = `${yyyy}-${mm}-${dd}T03:30:00-03:00`;
    
    return { start, end };
  }, []);

  // Estados para datas inicial e final
  const [dateStart, setDateStart] = useState<string>(getToday());
  const [dateEnd, setDateEnd] = useState<string>(getToday());

  const [salesData, setSalesData] = useState<SaiposSalesData[]>([]);
  const [dailyData, setDailyData] = useState<SaiposSalesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");

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
      case "30d":
        setDateStart(subtractDays(30));
        setDateEnd(hoje);
        break;
      case "90d":
        setDateStart(subtractDays(90));
        setDateEnd(hoje);
        break;
      default:
        setDateStart(subtractDays(30));
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

  // 🔹 Carregar dados da API Saipos usando a nova rota /api/saipos/vendas
  const loadSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      setErrorMsg(null);

      // Obter token da API conectada (da loja selecionada ou primeira conectada)
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length === 0) throw new Error('Nenhuma API Saipos conectada');
      const targetApi = selectedStore?.apiId
        ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
        : saiposApis[0];

      // Calcular o range de datas considerando horário de funcionamento (17:00-03:30)
      const rangeStart = getSaiposRange(dateStart);
      const rangeEnd = getSaiposRange(dateEnd);
      
      // start = início do dateStart (17:00)
      const start = rangeStart.start;
      // end = fim do dateEnd (03:30 do dia seguinte)
      const end = rangeEnd.end;
      
      console.log("Período selecionado - dateStart:", dateStart, "dateEnd:", dateEnd);
      console.log("Range calculado - start:", start, "end:", end);
      
      const params = new URLSearchParams({ data_inicial: start, data_final: end });
      if (targetApi.id) {
        params.append('apiId', targetApi.id);
      }
      // Enviar apenas apiId para o backend (não enviar storeId)

      const res = await fetch(`/api/saipos/vendas?${params.toString()}`, {
        headers: { 
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
      });

      // Sempre tentar ler o envelope do servidor
      const resp = await res.json().catch(() => ({ data: [], meta: { status: res.status } }));
      console.debug('Saipos meta:', resp?.meta);

      if (resp?.meta?.status >= 400) {
        console.error('Erro na resposta da API:', resp?.meta?.error);
        setErrorMsg(`Erro ao conectar à Saipos (status ${resp.meta.status}): ${resp.meta.error || 'Erro desconhecido'}`);
        setSalesData([]);
        updateDashboardData({ totalSales: 0, totalOrders: 0, averageTicket: 0, uniqueCustomers: 0 });
        return;
      }

      const vendas = Array.isArray(resp?.data) ? resp.data : [];
      console.log('📦 Vendas recebidas (raw):', vendas.length);
      console.log('📦 Resposta completa:', resp);
      if (vendas.length > 0) {
        console.log('📦 Primeira venda (sample):', JSON.stringify(vendas[0]).substring(0, 300));
      }

      if (vendas.length === 0) {
        // Não lançar erro; apenas renderizar vazio/zeros
        console.log('⚠️ Nenhuma venda encontrada no período');
        console.log('⚠️ Meta da resposta:', resp?.meta);
        setSalesData([]);
        updateDashboardData({ totalSales: 0, totalOrders: 0, averageTicket: 0, uniqueCustomers: 0 });
        addToast('Sem vendas no período selecionado', 'info');
        return;
      }

      console.log('🔄 Normalizando vendas...');
      const normalized = normalizeSalesResponse(vendas);
      console.log('✅ Vendas normalizadas:', normalized.length);
      if (normalized.length > 0) {
        console.log('✅ Primeira venda normalizada (sample):', JSON.stringify(normalized[0]).substring(0, 300));
      }

      if (!Array.isArray(normalized) || normalized.length === 0) {
        console.warn('Normalização retornou array vazio ou inválido');
        setSalesData([]);
        updateDashboardData({ totalSales: 0, totalOrders: 0, averageTicket: 0, uniqueCustomers: 0 });
        addToast('Erro ao processar dados de vendas', 'error');
        return;
      }

      setSalesData(normalized);
      
      // Filtrar apenas vendas do período selecionado (dateStart a dateEnd)
      const startDateOnly = dateStart.split('T')[0];
      const endDateOnly = dateEnd.split('T')[0];
      
      const filteredByPeriod = normalized.filter(item => {
        const itemDate = item.date?.split('T')[0] || item.date;
        return itemDate >= startDateOnly && itemDate <= endDateOnly;
      });
      
      console.log(`📅 Período selecionado: ${startDateOnly} a ${endDateOnly}`);
      console.log(`📅 Vendas normalizadas (total): ${normalized.length}`);
      console.log(`📅 Vendas filtradas pelo período: ${filteredByPeriod.length}`);
      if (filteredByPeriod.length > 0) {
        console.log(`📅 Datas encontradas no período:`, filteredByPeriod.map(v => v.date));
      }
      
      // Atualizar dashboard com os dados agregados APENAS do período selecionado
      if (filteredByPeriod.length > 0) {
        const totals = filteredByPeriod.reduce((acc, item) => ({
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
      }

      addToast("Dados atualizados com sucesso!", "success");
    } catch (error) {
      console.error("=== ERRO AO CARREGAR DADOS ===");
      console.error("Erro completo:", error);
      console.error("Erro message:", error instanceof Error ? error.message : String(error));
      console.error("Erro stack:", error instanceof Error ? error.stack : 'N/A');
      addToast("Erro ao carregar dados da Saipos", "error");
      setErrorMsg(error instanceof Error ? error.message : "Erro ao conectar à Saipos");
      setSalesData([]);
      updateDashboardData({ totalSales: 0, totalOrders: 0, averageTicket: 0, uniqueCustomers: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [dateStart, dateEnd, selectedStore, addToast, connectedAPIs, updateDashboardData, getSaiposRange]);

  // 🔹 Carregar dados diários
  const loadDailyData = async (date: Date) => {
    try {
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length === 0) {
        console.log('⚠️ Nenhuma API Saipos conectada para carregar dados diários');
        setDailyData(null);
        setErrorMsg("Conecte uma API Saipos em /connections para visualizar dados");
        return;
      }
      const targetApi = selectedStore?.apiId
        ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
        : saiposApis[0];

      const dateStr = date.toISOString().split("T")[0];
      console.log('📅 Buscando dados diários para:', dateStr, 'API:', targetApi.name);
      
      const raw = await saiposHTTP.getDailyReport(dateStr, targetApi.apiKey as string, targetApi.id);
      console.log('📦 Dados brutos recebidos (daily):', raw);
      
      // Normalizar os dados primeiro
      const normalized = normalizeDailyResponse(raw);
      console.log('✅ Dados normalizados (daily):', normalized);
      
      // Verificar se retornou dados válidos
      if (!normalized || normalized.totalOrders === 0) {
        console.log(`⚠️ Nenhuma venda encontrada para ${dateStr}`);
        setDailyData(null);
        
        // Sugerir datas anteriores com dados
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date(date);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        setErrorMsg(`Nenhuma venda em ${date.toLocaleDateString('pt-BR')}. Tente: ${yesterday.toLocaleDateString('pt-BR')}, ${twoDaysAgo.toLocaleDateString('pt-BR')} ou 02/11/2025.`);
        
        // Limpar os valores do dashboard
        updateDashboardData({
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          uniqueCustomers: 0,
        });
        return;
      }
      
      setDailyData(normalized);
      setErrorMsg(null); // Limpar erro se houver sucesso
      
      // Se retornou dados válidos, atualizar o dashboard
      if (normalized && normalized.totalOrders > 0) {
        console.log('📊 Atualizando dashboard com dados:', normalized);
        updateDashboardData({
          totalSales: normalized.totalSales,
          totalOrders: normalized.totalOrders,
          averageTicket: normalized.averageTicket,
          uniqueCustomers: normalized.uniqueCustomers,
        });
        addToast(`✅ ${normalized.totalOrders} vendas carregadas para ${date.toLocaleDateString('pt-BR')}`, "success");
      } else {
        console.log('⚠️ Nenhuma venda encontrada para o dia:', dateStr);
        setErrorMsg(`Sem vendas em ${date.toLocaleDateString('pt-BR')}`);
        updateDashboardData({
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          uniqueCustomers: 0,
        });
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados diários:", error);
      setDailyData(null);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("Erro detalhado:", errorMessage);
      
      if (errorMessage.includes('Não autenticado')) {
        setErrorMsg("Faça login para visualizar os dados");
      } else if (errorMessage.includes('não encontrada')) {
        setErrorMsg("API Saipos não configurada. Configure em /connections");
      } else {
        setErrorMsg(`Erro ao buscar dados: ${errorMessage}`);
      }
      
      // Limpar dashboard em caso de erro
      updateDashboardData({
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
      });
    }
  };

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

    // Iniciar polling a cada 60s usando token da API
    const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
    const targetApi = selectedStore?.apiId
      ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
      : saiposApis[0];
    if (targetApi && selectedStore) {
      realtimeService.startPolling(async () => {
        try {
          // Calcular o range de datas considerando horário de funcionamento (17:00-03:30)
          const rangeStart = getSaiposRange(dateStart);
          const rangeEnd = getSaiposRange(dateEnd);
          
          const start = rangeStart.start;
          const end = rangeEnd.end;
          
          const params = new URLSearchParams({
            data_inicial: start,
            data_final: end,
          });
          params.append('apiId', targetApi.id);

          const res = await fetch(`/api/saipos/vendas?${params.toString()}`, {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          });
          const resp = await res.json().catch(() => ({ data: [], meta: { status: res.status } }));
          console.debug('Saipos meta:', resp?.meta);

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

          const normalized = normalizeSalesResponse(vendas);
          const totals = normalized.reduce((acc, item) => ({
            totalSales: acc.totalSales + (item.totalSales || 0),
            totalOrders: acc.totalOrders + (item.totalOrders || 0),
          }), { totalSales: 0, totalOrders: 0 });
          const averageTicket = totals.totalOrders > 0 ? totals.totalSales / totals.totalOrders : 0;

          return {
            storeId: selectedStore.id,
            type: 'sales',
            data: { totalSales: totals.totalSales, totalOrders: totals.totalOrders, averageTicket },
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
  }, [selectedStore, updateDashboardData, connectedAPIs, dateStart, dateEnd, dashboardData.totalSales, dashboardData.totalOrders, dashboardData.averageTicket, getSaiposRange]);

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
                onChange={(e) => {
                  setDateStart(e.target.value);
                }}
                className="px-3 py-2 bg-[#141415] border border-[#374151] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#001F05]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Data Final</label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => {
                  setDateEnd(e.target.value);
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
              variant={selectedPeriod === "30d" ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange("30d")}
              className={`${
                selectedPeriod === "30d"
                  ? "bg-[#001F05] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              30D
            </Button>
            <Button
              variant={selectedPeriod === "90d" ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePeriodChange("90d")}
              className={`${
                selectedPeriod === "90d"
                  ? "bg-[#001F05] text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              90D
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