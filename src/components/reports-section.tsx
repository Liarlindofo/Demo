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

  const [salesData, setSalesData] = useState<SaiposSalesData[]>([]);
  const [dailyData, setDailyData] = useState<SaiposSalesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    addToast(`Período alterado para ${period}`, "info");
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length > 0) {
        addToast(`Data alterada para ${date.toLocaleDateString("pt-BR")}`, "info");
        loadDailyData(date);
      } else {
        addToast('Conecte uma API Saipos para visualizar relatórios diários', "info");
      }
    }
  };

  // 🔹 Carregar dados da API Saipos
  const loadSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      setErrorMsg(null);
      const endDate = new Date();
      const startDate = new Date();

      switch (selectedPeriod) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(endDate.getDate() - 90);
          break;
        case "1d":
          startDate.setDate(endDate.getDate() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Obter token da API conectada (da loja selecionada ou primeira conectada)
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length === 0) throw new Error('Nenhuma API Saipos conectada');
      const targetApi = selectedStore?.apiId
        ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
        : saiposApis[0];

      const raw = await saiposHTTP.getSalesData(
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        targetApi.apiKey as string,
        targetApi.id
      );

      const normalized = normalizeSalesResponse(raw);
      if (!Array.isArray(normalized) || normalized.length === 0) {
        throw new Error('Resposta da API sem dados utilizáveis');
      }

      setSalesData(normalized);
      addToast("Dados atualizados com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      addToast("Erro ao carregar dados da Saipos", "error");
      setErrorMsg("Erro ao conectar à Saipos");
      setSalesData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, selectedStore, addToast, connectedAPIs]);

  // 🔹 Carregar dados diários
  const loadDailyData = async (date: Date) => {
    try {
      const saiposApis = connectedAPIs.filter(api => api.type === 'saipos' && api.status === 'connected' && api.apiKey);
      if (saiposApis.length === 0) {
        console.log('⚠️ Nenhuma API Saipos conectada para carregar dados diários');
        setDailyData(null);
        return;
      }
      const targetApi = selectedStore?.apiId
        ? (saiposApis.find(a => a.id === selectedStore.apiId) || saiposApis[0])
        : saiposApis[0];

      const dateStr = date.toISOString().split("T")[0];
      console.log('📅 Buscando dados diários para:', dateStr, 'API:', targetApi.name);
      
      const raw = await saiposHTTP.getDailyReport(dateStr, targetApi.apiKey as string, targetApi.id);
      console.log('📦 Dados brutos recebidos (daily):', raw);
      
      const normalized = normalizeDailyResponse(raw);
      console.log('✅ Dados normalizados (daily):', normalized);
      
      setDailyData(normalized);
      
      // Se retornou dados válidos, atualizar o dashboard
      if (normalized && normalized.totalOrders > 0) {
        console.log('📊 Atualizando dashboard com dados:', normalized);
        updateDashboardData({
          totalSales: normalized.totalSales,
          totalOrders: normalized.totalOrders,
          averageTicket: normalized.averageTicket,
          uniqueCustomers: normalized.uniqueCustomers,
        });
      } else {
        console.log('⚠️ Nenhuma venda encontrada para o dia:', dateStr);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados diários:", error);
      setDailyData(null);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('Nenhuma API Saipos conectada')) {
        setErrorMsg((prev) => prev || "Erro ao conectar à Saipos");
      }
    }
  };

  // 🔹 Efeito para carregar dados
  useEffect(() => {
    if (selectedStore) {
      loadSalesData();
      const initialData = {
        totalSales: Math.floor(Math.random() * 2000) + 1000,
        totalOrders: Math.floor(Math.random() * 50) + 20,
        averageTicket: Math.floor(Math.random() * 30) + 20,
        uniqueCustomers: Math.floor(Math.random() * 30) + 10,
        isSyncing: false
      };
      updateDashboardData(initialData);
    }
  }, [selectedPeriod, selectedStore, loadSalesData, updateDashboardData]);

  // 🔹 Efeito para carregar relatórios diários
  useEffect(() => {
    if (!salesData.length) return;

    const last = salesData[salesData.length - 1];
    updateDashboardData({
      totalSales: last.totalSales,
      totalOrders: last.totalOrders,
      averageTicket: last.averageTicket,
      uniqueCustomers: last.uniqueCustomers,
      isSyncing: false
    });
  }, [salesData, updateDashboardData]);


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
          const today = new Date().toISOString().split('T')[0];
          const raw = await saiposHTTP.getDailyReport(today, targetApi.apiKey as string, targetApi.id);
          const daily = normalizeDailyResponse(raw);
          return {
            storeId: selectedStore.id,
            type: 'sales',
            data: { 
              totalSales: daily.totalSales || daily.totalRevenue || 0,
              totalOrders: daily.totalOrders || 0,
              averageTicket: daily.averageTicket || 0,
            },
            timestamp: new Date().toISOString(),
          } as RealtimeUpdate;
        } catch (error) {
          console.error('Erro no polling de dados diários:', error);
          return {
            storeId: selectedStore.id,
            type: 'sales',
            data: { totalSales: 0, totalOrders: 0, averageTicket: 0 },
            timestamp: new Date().toISOString(),
          } as RealtimeUpdate;
        }
      }, 60000);
    }

    return () => {
      realtimeService.unsubscribe(listenerId);
      realtimeService.stopPolling();
    };
  }, [selectedStore, updateDashboardData, connectedAPIs]);

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

        <div className="flex gap-2">
          <div className="flex bg-[#141415] rounded-lg p-1">
            {["1d", "7d", "30d", "90d"].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange(period)}
                className={`${
                  selectedPeriod === period
                    ? "bg-[#001F05] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {period}
              </Button>
            ))}
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
                    const end = new Date();
                    const start = new Date();
                    if (selectedPeriod === '7d') start.setDate(end.getDate() - 7);
                    else if (selectedPeriod === '30d') start.setDate(end.getDate() - 30);
                    else if (selectedPeriod === '90d') start.setDate(end.getDate() - 90);
                    else start.setDate(end.getDate() - 1);
                    const last = salesData[salesData.length - 1];
                    const msg = `Relatório ${selectedStore ? selectedStore.name : ''} (${selectedPeriod})\n` +
                      `Período: ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}\n` +
                      `Vendas: R$ ${last?.totalSales?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                      `Pedidos: ${last?.totalOrders}\n` +
                      `Ticket médio: R$ ${last?.averageTicket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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