"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Plus, Settings } from "lucide-react";

interface API {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
}

const availableAPIs: API[] = [
  {
    id: "saipos",
    name: "Saipos",
    description: "Sistema de gestão para restaurantes",
    icon: "🍕",
    status: "connected",
    lastSync: "2 min atrás"
  },
  {
    id: "ifood",
    name: "iFood",
    description: "Plataforma de delivery",
    icon: "🍔",
    status: "disconnected"
  },
  {
    id: "delivery-direto",
    name: "Delivery Direto",
    description: "Sistema de delivery próprio",
    icon: "🚚",
    status: "disconnected"
  }
];

export function APIConnectionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState<API | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (api: API) => {
    setIsConnecting(true);
    // Simular conexão
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnecting(false);
    setIsOpen(false);
    // Aqui você implementaria a lógica real de conexão
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
      case "error":
        return <Badge className="bg-red-600 text-white"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Desconectado</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-[#374151]">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141415] border-[#374151] text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Conectar APIs</DialogTitle>
          <DialogDescription className="text-gray-400">
            Conecte suas APIs para sincronizar dados e gerar relatórios automáticos
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* APIs Disponíveis */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">APIs Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableAPIs.map((api) => (
                <Card 
                  key={api.id} 
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                    api.status === "connected" 
                      ? "bg-[#001F05]/20 border-[#001F05]" 
                      : "bg-[#141415] border-[#374151]"
                  }`}
                  onClick={() => setSelectedAPI(api)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{api.icon}</span>
                        <div>
                          <CardTitle className="text-white text-base">{api.name}</CardTitle>
                          <CardDescription className="text-gray-400 text-sm">
                            {api.description}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(api.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {api.status === "connected" && api.lastSync && (
                      <p className="text-xs text-green-400">
                        Última sincronização: {api.lastSync}
                      </p>
                    )}
                    {api.status === "disconnected" && (
                      <Button 
                        size="sm" 
                        className="w-full bg-[#001F05] hover:bg-[#001F05]/80 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAPI(api);
                        }}
                      >
                        Conectar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Adicionar API Personalizada */}
          <Card className="bg-[#141415] border-[#374151] border-dashed">
            <CardContent className="p-6 text-center">
              <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-2">Adicionar API Personalizada</h3>
              <p className="text-gray-400 text-sm mb-4">
                Conecte outras APIs ou sistemas personalizados
              </p>
              <Button 
                variant="outline" 
                className="border-[#374151] text-white hover:bg-[#374151]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar API
              </Button>
            </CardContent>
          </Card>

          {/* Configuração da API Selecionada */}
          {selectedAPI && (
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <span className="text-2xl">{selectedAPI.icon}</span>
                  Configurar {selectedAPI.name}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {selectedAPI.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="api-key" className="text-white">Chave da API</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Insira sua chave da API"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleConnect(selectedAPI)}
                    disabled={!apiKey || isConnecting}
                    className="bg-[#001F05] hover:bg-[#001F05]/80 text-white"
                  >
                    {isConnecting ? "Conectando..." : "Conectar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAPI(null)}
                    className="border-[#374151] text-white hover:bg-[#374151]"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

