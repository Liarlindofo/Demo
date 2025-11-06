'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function TestAPIPage() {
  const [startDate, setStartDate] = useState('2025-11-01');
  const [endDate, setEndDate] = useState('2025-11-04');
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/saipos/sales?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const testDailyAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/saipos/daily?date=${startDate}`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="bg-[#0a0a0b] border-[#1f1f20]">
        <CardHeader>
          <CardTitle className="text-white">Teste da API Saipos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#141415] border-[#374151] text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 text-sm">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#141415] border-[#374151] text-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={testAPI} disabled={loading} className="bg-[#001F05] hover:bg-[#003308]">
              {loading ? 'Testando...' : 'Testar /sales'}
            </Button>
            <Button onClick={testDailyAPI} disabled={loading} className="bg-[#001F05] hover:bg-[#003308]">
              {loading ? 'Testando...' : 'Testar /daily'}
            </Button>
          </div>

          {result !== null && (
            <div className="mt-4">
              <h3 className="text-white font-bold mb-2">Resultado:</h3>
              <pre className="bg-[#141415] p-4 rounded text-xs text-gray-300 overflow-auto max-h-[600px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

