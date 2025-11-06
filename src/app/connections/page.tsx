"use client";

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Plus, 
  Zap, 
  Link2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Save, 
  Trash2, 
  TestTube, 
  Settings2,
  Sparkles,
  Shield,
  Clock,
  Info,
  Lock
} from 'lucide-react';

interface LocalAPIForm {
  id?: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  avatar?: string;
  status?: "connected" | "disconnected" | "error";
  lastTest?: string | null;
}

export default function ConnectionsPage() {
  const { userId, connectedAPIs, loadUserAPIs, createUserAPI, updateUserAPI, deleteUserAPI, testUserAPI, addToast } = useApp();
  const [forms, setForms] = useState<LocalAPIForm[]>([]);
  const saiposAPIs = useMemo(() => connectedAPIs.filter(a => a.type === 'saipos'), [connectedAPIs]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupName, setPopupName] = useState('Loja 1');
  const [popupToken, setPopupToken] = useState('');
  const [popupError, setPopupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserAPIs();
  }, [loadUserAPIs]);

  useEffect(() => {
    const mapped = saiposAPIs.map(api => ({
      id: api.id,
      name: api.name,
      apiKey: api.apiKey || '',
      baseUrl: 'https://data.saipos.io/v1', // Sempre usar URL fixa
      avatar: `/avatars/store-1.png`,
      status: api.status,
      lastTest: api.lastTest || null,
    }));
    setForms(mapped);
  }, [saiposAPIs]);

  const canAdd = forms.length < 4;

  const handleAdd = () => {
    if (!canAdd) return;
    setForms(prev => [...prev, { name: `Loja ${prev.length + 1}`, apiKey: '', baseUrl: 'https://data.saipos.io/v1', avatar: `/avatars/store-${(prev.length % 4) + 1}.png` }]);
  };

  const handleSave = async (idx: number) => {
    const f = forms[idx];
    if (!f.name || !f.apiKey) {
      addToast('Nome e token são obrigatórios', 'error');
      return;
    }
    // Sempre usar a URL fixa da Saipos
    const fixedBaseUrl = 'https://data.saipos.io/v1';
    if (f.id) {
      await updateUserAPI(f.id, { name: f.name, apiKey: f.apiKey, baseUrl: fixedBaseUrl });
    } else {
      await createUserAPI({ name: f.name, type: 'saipos', apiKey: f.apiKey, baseUrl: fixedBaseUrl });
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
    setTestingIds(prev => new Set(prev).add(f.id!));
    try {
      await testUserAPI(f.id);
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev);
        next.delete(f.id!);
        return next;
      });
    }
  };

  // Fluxo robusto via pop-up (sem sair da tela)
  const ensureUser = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/stack-sync', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handlePopupSubmit = async () => {
    setPopupError(null);
    if (!popupName.trim() || !popupToken.trim()) {
      setPopupError('Informe nome e token.');
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await ensureUser();
      if (!ok && !userId) {
        setPopupError('Faça login para salvar sua API.');
        return;
      }

      // Criar API diretamente na rota para obter o ID e já testar
      const createRes = await fetch('/api/user-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: popupName.trim(), type: 'saipos', apiKey: popupToken.trim(), baseUrl: 'https://data.saipos.io/v1' })
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao salvar API');
      }
      const created = await createRes.json();
      const apiId: string | undefined = created?.api?.id;
      if (!apiId) throw new Error('Resposta inválida da criação da API');

      // Testar imediatamente
      const testRes = await fetch(`/api/user-apis/test?id=${apiId}`, { method: 'POST' });
      if (!testRes.ok) {
        const j = await testRes.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao testar API');
      }

      addToast('API conectada com sucesso!', 'success');
      setIsPopupOpen(false);
      setPopupToken('');
      await loadUserAPIs();
    } catch (e: unknown) {
      console.error('Popup connect error:', e);
      const message = (e as Error)?.message || 'Erro ao conectar API';
      setPopupError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header com gradiente e ícones */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#001F05]/50 to-transparent rounded-lg blur-xl"></div>
        <div className="relative bg-[#141415] border border-[#374151] rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#001F05] rounded-lg">
              <Link2 className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                Conexões Saipos
                <Sparkles className="h-5 w-5 text-green-400" />
              </h1>
              <p className="text-gray-400 mt-1 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Conecte até 4 lojas com seus tokens Bearer
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#0f0f10] rounded-lg border border-[#374151]">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">
                {forms.filter(f => f.status === 'connected').length} / {forms.length} conectadas
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-[#141415] border-[#374151] shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#374151] pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-green-400" />
            APIs conectadas
          </CardTitle>
          <div className="flex gap-2">
            {canAdd && (
              <Button 
                onClick={handleAdd} 
                className="bg-[#0f0f10] border border-[#374151] text-white hover:bg-[#1f1f22] transition-all hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar linha
              </Button>
            )}
            {canAdd && (
              <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#001F05] hover:bg-[#002F08] transition-all hover:scale-105 shadow-lg">
                    <Zap className="h-4 w-4 mr-2" />
                    Conectar via Pop‑up
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#141415] border-[#374151] text-white shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <div className="p-2 bg-[#001F05] rounded-lg">
                        <Link2 className="h-5 w-5 text-green-400" />
                      </div>
                      Conectar PDV Saipos
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 flex items-center gap-2 mt-2">
                      <Info className="h-4 w-4" />
                      Cole seu Bearer Token para conectar imediatamente sem sair desta tela.
                    </DialogDescription>
                  </DialogHeader>
                  {popupError && (
                    <Alert variant="destructive">
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>{popupError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="popup-name" className="text-gray-300">Nome</Label>
                      <Input id="popup-name" value={popupName} onChange={e => setPopupName(e.target.value)} className="bg-[#0f0f10] border-[#374151] text-white" />
                    </div>
                    <div>
                      <Label htmlFor="popup-token" className="text-gray-300">Token Bearer</Label>
                      <Input id="popup-token" type="password" value={popupToken} onChange={e => setPopupToken(e.target.value)} className="bg-[#0f0f10] border-[#374151] text-white" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handlePopupSubmit} 
                      disabled={isSubmitting} 
                      className="bg-[#001F05] hover:bg-[#002F08] transition-all w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Conectar agora
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {forms.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-[#374151] rounded-lg">
              <Link2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma API. Adicione a primeira conexão.</p>
            </div>
          )}
          {forms.map((f, idx) => (
            <div 
              key={f.id || idx} 
              className="group rounded-lg border border-[#374151] bg-[#0f0f10] p-5 transition-all hover:border-[#001F05] hover:shadow-lg hover:shadow-[#001F05]/20"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 ring-2 ring-[#374151] group-hover:ring-[#001F05] transition-all">
                    <AvatarImage src={f.avatar || `/avatars/store-1.png`} />
                    <AvatarFallback className="bg-gradient-to-br from-[#001F05] to-[#003F0A] text-white font-bold">
                      {f.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0f0f10] flex items-center justify-center ${
                    f.status === 'connected' ? 'bg-green-500' : 
                    f.status === 'error' ? 'bg-red-500' : 
                    'bg-gray-500'
                  }`}>
                    {f.status === 'connected' && <CheckCircle2 className="h-3 w-3 text-white" />}
                    {f.status === 'error' && <XCircle className="h-3 w-3 text-white" />}
                    {f.status === 'disconnected' && <AlertCircle className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      f.status === 'connected' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : f.status === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {f.status === 'connected' && <CheckCircle2 className="h-3 w-3" />}
                      {f.status === 'error' && <XCircle className="h-3 w-3" />}
                      {f.status === 'disconnected' && <AlertCircle className="h-3 w-3" />}
                      {f.status === 'connected' ? 'Conectada' : f.status === 'error' ? 'Erro' : 'Desconectada'}
                    </div>
                    {f.lastTest && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        Último teste: {new Date(f.lastTest).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${idx}`} className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <span>Nome</span>
                      </Label>
                      <Input 
                        id={`name-${idx}`} 
                        value={f.name} 
                        onChange={e => {
                          const v = e.target.value; 
                          setForms(prev => prev.map((x,i)=> i===idx?{...x,name:v}:x));
                        }} 
                        className="bg-[#141415] border-[#374151] text-white focus:border-[#001F05] focus:ring-2 focus:ring-[#001F05]/20 transition-all" 
                        placeholder="Nome da loja"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Lock className="h-3 w-3 text-gray-500" />
                        Base URL
                      </Label>
                      <div className="relative">
                        <Input 
                          value="https://data.saipos.io/v1" 
                          disabled
                          className="bg-[#0f0f10] border-[#374151] text-gray-400 font-mono text-sm cursor-not-allowed opacity-60"
                        />
                        <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">URL fixa da API Saipos (não editável)</p>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`token-${idx}`} className="text-gray-300 text-sm font-medium flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        Token Bearer
                      </Label>
                      <Input 
                        id={`token-${idx}`} 
                        type="password" 
                        value={f.apiKey} 
                        onChange={e => {
                          const v = e.target.value; 
                          setForms(prev => prev.map((x,i)=> i===idx?{...x,apiKey:v}:x));
                        }} 
                        className="bg-[#141415] border-[#374151] text-white focus:border-[#001F05] focus:ring-2 focus:ring-[#001F05]/20 transition-all font-mono text-sm" 
                        placeholder="Bearer token..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <Separator className="my-4 bg-[#374151]" />
              <div className="flex gap-2 justify-end">
                {f.id && (
                  <Button 
                    variant="secondary" 
                    onClick={() => handleTest(idx)} 
                    disabled={testingIds.has(f.id)}
                    className="bg-[#0f0f10] border border-[#374151] text-white hover:bg-[#1f1f22] transition-all hover:scale-105"
                  >
                    {testingIds.has(f.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Testando...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Verificar conexão
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  onClick={() => handleSave(idx)} 
                  className="bg-[#001F05] hover:bg-[#002F08] transition-all hover:scale-105" 
                  disabled={!userId}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDelete(idx)}
                  className="transition-all hover:scale-105"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#141415] to-[#0f0f10] border-[#374151] shadow-lg">
        <CardHeader className="border-b border-[#374151] pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-green-400" />
            Dicas e Informações
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0f0f10] border border-[#374151] hover:border-[#001F05] transition-all">
              <Shield className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">Segurança</p>
                <p className="text-gray-400 text-sm mt-1">Use tokens Bearer da sua conta Saipos (nunca exponha publicamente).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0f0f10] border border-[#374151] hover:border-[#001F05] transition-all">
              <Link2 className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">Limite de Conexões</p>
                <p className="text-gray-400 text-sm mt-1">Você pode conectar até 4 APIs (uma por loja).</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0f0f10] border border-[#374151] hover:border-[#001F05] transition-all">
              <Sparkles className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">Dashboard</p>
                <p className="text-gray-400 text-sm mt-1">Após conectar, suas lojas aparecerão no carrossel do dashboard.</p>
              </div>
            </div>
            {!userId && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium text-sm">Login Necessário</p>
                  <p className="text-red-400/80 text-sm mt-1">Faça login para salvar suas APIs.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


