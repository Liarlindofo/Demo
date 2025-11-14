"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Menu } from "lucide-react";
import { useApp } from "@/contexts/app-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function APIConnectionDialog() {
  const { addToast, loadUserAPIs, testUserAPI } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ensureUser = async () => {
    try {
      await fetch('/api/auth/stack-sync', { method: 'POST' });
    } catch {
      // silencioso
    }
  };

  const handleConnectNow = async () => {
    setErrorMsg(null);
    if (!name.trim() || !apiKey.trim()) {
      setErrorMsg('Informe nome e token.');
      return;
    }
    setIsSubmitting(true);
    try {
      await ensureUser();
      const tokenClean = apiKey.trim().replace(/^Bearer\s+/i, '');
      const createRes = await fetch('/api/user-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type: 'saipos', apiKey: tokenClean, baseUrl: 'https://data.saipos.io/v1' })
      });
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao salvar API');
      }
      const created = await createRes.json();
      const apiId = created?.api?.id as string | undefined;
      if (apiId) {
        await testUserAPI(apiId);
      }
      await loadUserAPIs();
      addToast('API conectada com sucesso!', 'success');
      setIsOpen(false);
      setApiKey('');
    } catch (e: unknown) {
      const message = (e as Error)?.message || 'Erro ao conectar API';
      console.error('Erro ao conectar API no popup:', e);
      
      // Mensagem mais amigável para o usuário
      let userMessage = message;
      if (message.includes('fetch failed') || message.includes('Failed to fetch')) {
        userMessage = 'Não foi possível conectar com a API Saipos. Verifique o token e tente novamente.';
      }
      
      setErrorMsg(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-[#374151]">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141415] border-[#374151] text-white max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold">Conectar Saipos</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Cole seu Bearer Token e conecte imediatamente sem sair desta tela.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="name" className="text-gray-300">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0f0f10] border-[#374151] text-white" />
          </div>
          <div>
            <Label htmlFor="token" className="text-gray-300">Token Bearer</Label>
            <Input id="token" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="bg-[#0f0f10] border-[#374151] text-white" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={handleConnectNow} disabled={isSubmitting} className="bg-[#001F05]">
            {isSubmitting ? 'Conectando…' : 'Conectar agora'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
