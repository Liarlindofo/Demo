"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, ShoppingCart, DollarSign, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Dados mockados para os gráficos
const salesData = [
  { name: "Jan", vendas: 4000, pedidos: 240 },
  { name: "Fev", vendas: 3000, pedidos: 139 },
  { name: "Mar", vendas: 2000, pedidos: 980 },
  { name: "Abr", vendas: 2780, pedidos: 390 },
  { name: "Mai", vendas: 1890, pedidos: 480 },
  { name: "Jun", vendas: 2390, pedidos: 380 },
];

const dailyOrdersData = [
  { hora: "00:00", pedidos: 0 },
  { hora: "06:00", pedidos: 2 },
  { hora: "12:00", pedidos: 15 },
  { hora: "18:00", pedidos: 8 },
  { hora: "24:00", pedidos: 1 },
];

export function ReportsSection() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  const stats = [
    {
      title: "Vendas Hoje",
      value: "R$ 2.450,00",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
    },
    {
      title: "Pedidos Hoje",
      value: "47",
      change: "+8.2%",
      changeType: "positive" as const,
      icon: ShoppingCart,
    },
    {
      title: "Ticket Médio",
      value: "R$ 52,13",
      change: "-2.1%",
      changeType: "negative" as const,
      icon: TrendingUp,
    },
    {
      title: "Clientes Únicos",
      value: "23",
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Users,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-gray-400">Acompanhe o desempenho do seu negócio</p>
        </div>
        
        <div className="flex gap-2">
          {/* Filtro de período */}
          <div className="flex bg-[#141415] rounded-lg p-1">
            {["7d", "30d", "90d"].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
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
                {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#141415] border-[#374151]" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
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
          <Card key={index} className="bg-[#141415] border-[#374151]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className="flex flex-col items-end">
                  <stat.icon className="h-8 w-8 text-[#001F05] mb-2" />
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
              <LineChart data={salesData}>
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
              <BarChart data={dailyOrdersData}>
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

