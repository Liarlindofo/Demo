"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function RawDebugPage() {
  const [date, setDate] = useState('2025-11-02');
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const loadRawData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/saipos/raw-debug?date=${date}`);
      const data = await response.json();
      setResult(data);
      
      // Se tiver dados brutos, mostrar um item completo
      if (data.rawData && Array.isArray(data.rawData) && data.rawData.length > 0) {
        console.log('📋 ESTRUTURA COMPLETA DA PRIMEIRA VENDA:', JSON.stringify(data.rawData[0], null, 2));
      }
    } catch (error) {
      console.error('Erro ao carregar dados brutos:', error);
      setResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#0f0f10] p-4">
      <Card className="w-full max-w-6xl bg-[#141415] border-[#374151] shadow-lg">
        <CardHeader>
          <CardTitle className="text-white text-2xl">
            🔍 Debug RAW - Estrutura Exata da API Saipos
          </CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            Esta página exibe a estrutura EXATA dos dados retornados pela API Saipos, sem nenhuma normalização.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">
                Data para Debug
              </label>
              <Input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-[#0f0f10] border-[#374151] text-gray-400"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={loadRawData} 
                disabled={loading} 
                className="bg-[#001F05] hover:bg-[#003308] w-full"
              >
                {loading ? 'Carregando...' : '🔍 Carregar Dados Brutos'}
              </Button>
            </div>
          </div>

          {result !== null && (
            <div className="mt-4 space-y-4">
              {/* Informações Resumidas */}
              {typeof result === 'object' && result !== null && 'responseInfo' in result && (
                <div className="bg-[#0f0f10] p-4 rounded border border-[#374151]">
                  <h3 className="text-white font-bold mb-2">📊 Resumo da Resposta:</h3>
                  <pre className="text-xs text-gray-300 overflow-auto">
                    {JSON.stringify((result as {responseInfo: unknown}).responseInfo, null, 2)}
                  </pre>
                </div>
              )}

              {/* Primeira Venda Completa */}
              {typeof result === 'object' && 
               result !== null && 
               'rawData' in result && 
               Array.isArray((result as {rawData: unknown[]}).rawData) && 
               (result as {rawData: unknown[]}).rawData.length > 0 && (
                <div className="bg-[#0f0f10] p-4 rounded border border-yellow-600">
                  <h3 className="text-yellow-400 font-bold mb-2">
                    🎯 PRIMEIRA VENDA COMPLETA (Estrutura Real):
                  </h3>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-[400px]">
                    {JSON.stringify((result as {rawData: unknown[]}).rawData[0], null, 2)}
                  </pre>
                </div>
              )}

              {/* Dados Completos */}
              <div className="bg-[#0f0f10] p-4 rounded border border-[#374151]">
                <h3 className="text-white font-bold mb-2">📄 Dados Completos:</h3>
                <pre className="text-xs text-gray-300 overflow-auto max-h-[600px]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded">
            <h4 className="text-blue-400 font-bold mb-2">💡 Como usar:</h4>
            <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
              <li>Escolha uma data que você SABE que tem vendas (ex: 02/11/2025)</li>
              <li>Clique em &quot;Carregar Dados Brutos&quot;</li>
              <li>Veja a estrutura EXATA na seção amarela &quot;PRIMEIRA VENDA COMPLETA&quot;</li>
              <li>Copie esse JSON e me envie para eu ajustar a normalização</li>
              <li>Ou abra o console do navegador (F12) para ver logs detalhados</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

