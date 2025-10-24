"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, ShoppingCart, DollarSign, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useApp } from "@/contexts/app-context";
import { saiposAPI, SaiposSalesData } from "@/lib/saipos-api";
import { realtimeService, RealtimeUpdate } from "@/lib/realtime-service";

// Dados mockados para fallback
const dailyOrdersData = [
  { hora: "00:00", pedidos: 0 },
  { hora: "06:00", pedidos: 2 },
  { hora: "12:00", pedidos: 15 },
  { hora: "18:00", pedidos: 8 },
  { hora: "24:00", pedidos: 1 },
];

export function ReportsSection() {
  const { 
    selectedStore, 
    selectedPeriod, 
    setSelectedPeriod, 
    selectedDate, 
    setSelectedDate, 
    addToast,
    dashboardData,
    updateDashboardData
  } = useApp();
  const [salesData, setSalesData] = useState<SaiposSalesData[]>([]);
  const [dailyData, setDailyData] = useState<SaiposSalesData | null>(null);
  const [, setIsLoading] = useState(false);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    addToast(`Período alterado para ${period}`, "info");
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      addToast(`Data alterada para ${date.toLocaleDateString('pt-BR')}`, "info");
      loadDailyData(date);
    }
  };

  // Função para carregar dados da API da Saipos
  const loadSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calcular período baseado na seleção
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const data = await saiposAPI.getSalesData(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      setSalesData(data);
      addToast("Dados atualizados com sucesso!", "success");
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      addToast("Erro ao carregar dados da API", "error");
      // Usar dados mockados em caso de erro
      setSalesData([
        { date: "2025-01-01", totalSales: 4000, totalOrders: 240, averageTicket: 16.67, uniqueCustomers: 180, topProducts: [] },
        { date: "2025-01-02", totalSales: 3000, totalOrders: 139, averageTicket: 21.58, uniqueCustomers: 120, topProducts: [] },
        { date: "2025-01-03", totalSales: 2000, totalOrders: 98, averageTicket: 20.41, uniqueCustomers: 85, topProducts: [] },
        { date: "2025-01-04", totalSales: 2780, totalOrders: 139, averageTicket: 20.00, uniqueCustomers: 110, topProducts: [] },
        { date: "2025-01-05", totalSales: 1890, totalOrders: 95, averageTicket: 19.89, uniqueCustomers: 75, topProducts: [] },
        { date: "2025-01-06", totalSales: 2390, totalOrders: 120, averageTicket: 19.92, uniqueCustomers: 90, topProducts: [] },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, addToast]);

  // Função para carregar dados diários
  const loadDailyData = async (date: Date) => {
    try {
      const data = await saiposAPI.getDailyReport(date.toISOString().split('T')[0]);
      setDailyData(data);
    } catch (error) {
      console.error('Erro ao carregar dados diários:', error);
      // Usar dados mockados em caso de erro
      setDailyData({
        date: date.toISOString().split('T')[0],
        totalSales: 2450,
        totalOrders: 47,
        averageTicket: 52.13,
        uniqueCustomers: 23,
        topProducts: [
          { name: "Pizza Margherita", quantity: 12, revenue: 240 },
          { name: "Hambúrguer Clássico", quantity: 8, revenue: 160 },
          { name: "Coca-Cola", quantity: 15, revenue: 75 }
        ]
      });
    }
  };

  // Carregar dados quando o componente montar ou o período mudar
  useEffect(() => {
    loadSalesData();
  }, [selectedPeriod, loadSalesData]);

  // Carregar dados diários quando uma data for selecionada
  useEffect(() => {
    if (selectedDate) {
      loadDailyData(selectedDate);
    }
  }, [selectedDate]);

  // Configurar sincronização em tempo real
  useEffect(() => {
    if (!selectedStore) return;

    const listenerId = `realtime-${selectedStore.id}`;
    
    // Configurar listener para atualizações em tempo real
    realtimeService.subscribe(listenerId, (update: RealtimeUpdate) => {
      console.log('📊 Atualização em tempo real recebida:', update);
      
      // Atualizar dados do dashboard baseado no tipo de atualização
      switch (update.type) {
        case 'sales':
          updateDashboardData({ 
            totalSales: update.data.totalSales as number,
            isSyncing: true 
          });
          break;
        case 'orders':
          updateDashboardData({ 
            totalOrders: update.data.totalOrders as number,
            isSyncing: true 
          });
          break;
        case 'customers':
          updateDashboardData({ 
            uniqueCustomers: update.data.uniqueCustomers as number,
            isSyncing: true 
          });
          break;
      }
      
      // Remover estado de sincronização após 2 segundos
      setTimeout(() => {
        updateDashboardData({ isSyncing: false });
      }, 2000);
    });

    // Iniciar conexão em tempo real (usando mock para desenvolvimento)
    realtimeService.startMockUpdates(selectedStore.id);

    // Cleanup
    return () => {
      realtimeService.unsubscribe(listenerId);
      realtimeService.disconnect();
    };
  }, [selectedStore, updateDashboardData]);

  // Estatísticas dinâmicas baseadas nos dados em tempo real
  const stats = [
    {
      title: "Vendas Hoje",
      value: `R$ ${dashboardData.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
      value: `R$ ${dashboardData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-gray-400">
            {selectedStore 
              ? `Acompanhe o desempenho da ${selectedStore.name}` 
              : "Acompanhe o desempenho do seu negócio"
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Filtro de período */}
          <div className="flex bg-[#141415] rounded-lg p-1">
            {["7d", "30d", "90d"].map((period) => (
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
          
          {/* Seletor de data */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-[#141415] border-[#374151] text-white hover:bg-[#374151]"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
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

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className={`bg-[#141415] border-[#374151] transition-all duration-300 ${
            stat.isSyncing ? 'ring-2 ring-[#001F05]/50 bg-[#001F05]/5' : ''
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-8 w-8 text-[#001F05] mb-2 ${
                      stat.isSyncing ? 'animate-pulse' : ''
                    }`} />
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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas */}
        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader>
            <CardTitle className="text-white">Vendas dos Últimos 6 Meses</CardTitle>
            <CardDescription className="text-gray-400">
              Evolução das vendas e número de pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData.map(item => ({
                name: format(new Date(item.date), 'dd/MM'),
                vendas: item.totalSales,
                pedidos: item.totalOrders
              }))}>
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

        {/* Gráfico de Pedidos por Hora */}
        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader>
            <CardTitle className="text-white">Pedidos por Hora (Hoje)</CardTitle>
            <CardDescription className="text-gray-400">
              Distribuição de pedidos ao longo do dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData ? dailyData.topProducts.map((product) => ({
                hora: product.name.substring(0, 8) + "...",
                pedidos: product.quantity
              })) : dailyOrdersData}>
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








