"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { normalizeDailyResponse } from '@/lib/saipos-api';
import type { SaiposSalesData } from '@/lib/saipos-api';

export default function ValidateReportsPage() {
  const [date, setDate] = useState('2025-11-02');
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<unknown>(null);
  const [normalizedData, setNormalizedData] = useState<SaiposSalesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carregar automaticamente ao montar
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar dados brutos da API
      const response = await fetch(`/api/saipos/daily?date=${date}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      setRawData(data);
      
      // Normalizar dados
      const normalized = normalizeDailyResponse(data);
      setNormalizedData(normalized);
      
      console.log('📊 VALIDAÇÃO DE RELATÓRIOS');
      console.log('Raw Data:', data);
      console.log('Normalized Data:', normalized);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f10] p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-gradient-to-r from-[#001F05] to-[#003308] border-[#374151]">
          <CardHeader>
            <CardTitle className="text-white text-3xl">
              ✅ Validação de Relatórios Saipos
            </CardTitle>
            <p className="text-gray-300 mt-2">
              Esta página valida se os dados estão sendo puxados corretamente da API Saipos e normalizados de forma fiel.
            </p>
          </CardHeader>
        </Card>

        {/* Controles */}
        <Card className="bg-[#141415] border-[#374151]">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">
                  Data para Validar
                </label>
                <Input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[#0f0f10] border-[#374151] text-gray-400"
                />
              </div>
              <Button 
                onClick={loadData} 
                disabled={loading}
                className="bg-[#001F05] hover:bg-[#003308]"
              >
                {loading ? '⏳ Carregando...' : '🔄 Validar Dados'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Erro */}
        {error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="pt-6">
              <p className="text-red-400">❌ Erro: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Dados Normalizados */}
        {normalizedData && (
          <>
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-[#141415] border-[#374151]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Total de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-400">
                    R$ {normalizedData.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Campo: total_sale_value
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#141415] border-[#374151]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Total de Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-400">
                    {normalizedData.totalOrders}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Quantidade de vendas
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#141415] border-[#374151]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-purple-400">
                    R$ {normalizedData.averageTicket.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total / Pedidos
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#141415] border-[#374151]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Clientes Únicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-400">
                    {normalizedData.uniqueCustomers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Campo: customer.id_customer
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Vendas por Canal */}
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle className="text-white">📊 Vendas por Canal (id_sale_type)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#0f0f10] p-4 rounded border border-[#374151]">
                    <p className="text-gray-400 text-sm">🚚 Delivery (Tipo 1)</p>
                    <p className="text-2xl font-bold text-green-400 mt-1">
                      {normalizedData.ordersByChannel.delivery} pedidos
                    </p>
                    <p className="text-xl text-gray-300 mt-1">
                      R$ {(normalizedData.deliverySales || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[#0f0f10] p-4 rounded border border-[#374151]">
                    <p className="text-gray-400 text-sm">🏪 Retirada (Tipo 2)</p>
                    <p className="text-2xl font-bold text-blue-400 mt-1">
                      {normalizedData.ordersByChannel.counter} pedidos
                    </p>
                    <p className="text-xl text-gray-300 mt-1">
                      R$ {(normalizedData.counterSales || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[#0f0f10] p-4 rounded border border-[#374151]">
                    <p className="text-gray-400 text-sm">🍽️ Salão (Tipo 3)</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">
                      {normalizedData.ordersByChannel.hall} pedidos
                    </p>
                    <p className="text-xl text-gray-300 mt-1">
                      R$ {(normalizedData.hallSales || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-[#0f0f10] p-4 rounded border border-[#374151]">
                    <p className="text-gray-400 text-sm">🎫 Ficha (Tipo 4)</p>
                    <p className="text-2xl font-bold text-orange-400 mt-1">
                      {normalizedData.ordersByChannel.ticket} pedidos
                    </p>
                    <p className="text-xl text-gray-300 mt-1">
                      R$ {(normalizedData.ticketSales || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Produtos */}
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle className="text-white">🏆 Top 10 Produtos</CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Baseado em items[].desc_sale_item + choices[].aditional_price
                </p>
              </CardHeader>
              <CardContent>
                {normalizedData.topProducts.length > 0 ? (
                  <div className="space-y-2">
                    {normalizedData.topProducts.map((product, idx) => (
                      <div 
                        key={idx}
                        className="bg-[#0f0f10] p-3 rounded border border-[#374151] flex justify-between items-center"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {idx + 1}. {product.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            Quantidade: {product.quantity}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-green-400">
                          R$ {product.revenue.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">Nenhum produto encontrado</p>
                )}
              </CardContent>
            </Card>

            {/* Dados Brutos */}
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle className="text-white">📄 Dados Brutos da API</CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  {Array.isArray(rawData) 
                    ? `Array com ${rawData.length} vendas` 
                    : 'Objeto ou null'}
                </p>
              </CardHeader>
              <CardContent>
                <pre className="bg-[#0f0f10] p-4 rounded text-xs text-gray-300 overflow-auto max-h-[400px]">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}

        {/* Instruções */}
        <Card className="bg-blue-900/20 border-blue-700">
          <CardHeader>
            <CardTitle className="text-blue-400">💡 Como Validar</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2">
            <p>1. Escolha uma data que você SABE que tem vendas (ex: 02/11/2025)</p>
            <p>2. Clique em &quot;Validar Dados&quot;</p>
            <p>3. Verifique se os valores nas métricas correspondem aos dados reais do Saipos</p>
            <p>4. Compare os &quot;Dados Brutos da API&quot; com os valores calculados</p>
            <p>5. Verifique se os produtos estão corretos e se os preços incluem complementos</p>
            <p className="mt-4 font-bold text-blue-300">
              ✅ Se os dados estiverem corretos aqui, os relatórios principais também estarão!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

