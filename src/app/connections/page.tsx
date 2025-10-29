"use client";

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface LocalAPIForm {
  id?: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  avatar?: string;
}

export default function ConnectionsPage() {
  const { userId, connectedAPIs, loadUserAPIs, createUserAPI, updateUserAPI, deleteUserAPI, testUserAPI, addToast } = useApp();
  const [forms, setForms] = useState<LocalAPIForm[]>([]);
  const saiposAPIs = useMemo(() => connectedAPIs.filter(a => a.type === 'saipos'), [connectedAPIs]);

  useEffect(() => {
    loadUserAPIs();
  }, [loadUserAPIs]);

  useEffect(() => {
    const mapped = saiposAPIs.map(api => ({ id: api.id, name: api.name, apiKey: api.apiKey || '', baseUrl: api.baseUrl || 'https://api.saipos.com.br/v1', avatar: `/avatars/store-1.png` }));
    setForms(mapped);
  }, [saiposAPIs]);

  const canAdd = forms.length < 4;

  const handleAdd = () => {
    if (!canAdd) return;
    setForms(prev => [...prev, { name: `Loja ${prev.length + 1}`, apiKey: '', baseUrl: 'https://api.saipos.com.br/v1', avatar: `/avatars/store-${(prev.length % 4) + 1}.png` }]);
  };

  const handleSave = async (idx: number) => {
    const f = forms[idx];
    if (!f.name || !f.apiKey) {
      addToast('Nome e token são obrigatórios', 'error');
      return;
    }
    if (f.id) {
      await updateUserAPI(f.id, { name: f.name, apiKey: f.apiKey, baseUrl: f.baseUrl });
    } else {
      await createUserAPI({ name: f.name, type: 'saipos', apiKey: f.apiKey, baseUrl: f.baseUrl });
    }
    await loadUserAPIs();
  };

  const handleDelete = async (idx: number) => {
    const f = forms[idx];
    if (f.id) {
      await deleteUserAPI(f.id);
      await loadUserAPIs();
    } else {
      setForms(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleTest = async (idx: number) => {
    const f = forms[idx];
    if (!f.id) {
      addToast('Salve antes de testar', 'info');
      return;
    }
    await testUserAPI(f.id);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Conexões Saipos</h1>
        <p className="text-gray-400">Conecte até 4 lojas com seus tokens Bearer</p>
      </div>

      <Card className="bg-[#141415] border-[#374151]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">APIs conectadas</CardTitle>
          {canAdd && (
            <Button onClick={handleAdd} className="bg-[#001F05]">
              Adicionar API
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {forms.length === 0 && (
            <div className="text-gray-400">Nenhuma API. Adicione a primeira conexão.</div>
          )}
          {forms.map((f, idx) => (
            <div key={f.id || idx} className="rounded-lg border border-[#374151] p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={f.avatar || `/avatars/store-1.png`} />
                  <AvatarFallback className="bg-[#001F05] text-white">S</AvatarFallback>
                </Avatar>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  <div>
                    <Label htmlFor={`name-${idx}`} className="text-gray-300">Nome</Label>
                    <Input id={`name-${idx}`} value={f.name} onChange={e => {
                      const v = e.target.value; setForms(prev => prev.map((x,i)=> i===idx?{...x,name:v}:x));
                    }} className="bg-[#0f0f10] border-[#374151] text-white" />
                  </div>
                  <div>
                    <Label htmlFor={`base-${idx}`} className="text-gray-300">Base URL</Label>
                    <Input id={`base-${idx}`} value={f.baseUrl || ''} onChange={e => {
                      const v = e.target.value; setForms(prev => prev.map((x,i)=> i===idx?{...x,baseUrl:v}:x));
                    }} className="bg-[#0f0f10] border-[#374151] text-white" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`token-${idx}`} className="text-gray-300">Token Bearer</Label>
                    <Input id={`token-${idx}`} type="password" value={f.apiKey} onChange={e => {
                      const v = e.target.value; setForms(prev => prev.map((x,i)=> i===idx?{...x,apiKey:v}:x));
                    }} className="bg-[#0f0f10] border-[#374151] text-white" />
                  </div>
                </div>
              </div>
              <Separator className="my-4 bg-[#374151]" />
              <div className="flex gap-2 justify-end">
                {f.id && (
                  <Button variant="secondary" onClick={() => handleTest(idx)} className="bg-[#0f0f10] border border-[#374151] text-white hover:bg-[#1f1f22]">Verificar conexão</Button>
                )}
                <Button onClick={() => handleSave(idx)} className="bg-[#001F05]" disabled={!userId}>Salvar</Button>
                <Button variant="destructive" onClick={() => handleDelete(idx)}>Excluir</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-[#141415] border-[#374151]">
        <CardHeader>
          <CardTitle className="text-white">Dicas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-gray-400 text-sm space-y-1">
            <li>Use tokens Bearer da sua conta Saipos (nunca exponha publicamente).</li>
            <li>Você pode conectar até 4 APIs (uma por loja).</li>
            <li>Após conectar, suas lojas aparecerão no carrossel do dashboard.</li>
            {!userId && (<li className="text-red-400">Faça login para salvar suas APIs.</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


