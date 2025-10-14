"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Plus, Menu, MessageSquare } from "lucide-react";

interface API {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  type: "saipos" | "custom" | "whatsapp";
}

const availableAPIs: API[] = [
  {
    id: "saipos-1",
    name: "PDV Principal",
    description: "Sistema de gestão para restaurantes",
    icon: "🍕",
    status: "connected",
    lastSync: "2 min atrás",
    type: "saipos"
  },
  {
    id: "saipos-2",
    name: "PDV Secundário",
    description: "Sistema de gestão para restaurantes",
    icon: "🍕",
    status: "disconnected",
    type: "saipos"
  },
  {
    id: "saipos-3",
    name: "PDV Terciário",
    description: "Sistema de gestão para restaurantes",
    icon: "🍕",
    status: "disconnected",
    type: "saipos"
  },
  {
    id: "saipos-4",
    name: "PDV Quaternário",
    description: "Sistema de gestão para restaurantes",
    icon: "🍕",
    status: "disconnected",
    type: "saipos"
  },
  {
    id: "whatsapp-1",
    name: "WhatsApp Business",
    description: "Envio automático de relatórios para grupos",
    icon: "📱",
    status: "disconnected",
    type: "whatsapp"
  }
];

export function APIConnectionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState<API | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [customAPIs, setCustomAPIs] = useState<API[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newAPIName, setNewAPIName] = useState("");
  const [newAPIDescription, setNewAPIDescription] = useState("");

  const handleConnect = async (api: API) => {
    setIsConnecting(true);
    // Simular conexão
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnecting(false);
    setIsOpen(false);
    // Aqui você implementaria a lógica real de conexão
  };

  const handleAddCustomAPI = () => {
    if (newAPIName.trim() && newAPIDescription.trim()) {
      const newAPI: API = {
        id: `custom-${Date.now()}`,
        name: newAPIName.trim(),
        description: newAPIDescription.trim(),
        icon: "🔧",
        status: "disconnected",
        type: "custom"
      };
      setCustomAPIs([...customAPIs, newAPI]);
      setNewAPIName("");
      setNewAPIDescription("");
      setShowAddCustom(false);
    }
  };

  const allAPIs = [...availableAPIs, ...customAPIs];

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
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#141415] border-[#374151] text-white max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Conectar APIs</DialogTitle>
          <DialogDescription className="text-gray-400">
            Conecte suas APIs para sincronizar dados e gerar relatórios automáticos
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* WhatsApp Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <img src="/whatsapp-logo.svg" alt="WhatsApp" className="w-5 h-5" />
              WhatsApp Business
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 lg:gap-4">
              {availableAPIs.filter(api => api.type === "whatsapp").map((api) => (
                <Card 
                  key={api.id} 
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 min-h-[120px] ${
                    api.status === "connected" 
                      ? "bg-[#001F05]/20 border-[#001F05]" 
                      : "bg-[#141415] border-[#374151]"
                  }`}
                  onClick={() => setSelectedAPI(api)}
                >
                  <CardHeader className="pb-3 p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-2xl flex-shrink-0">{api.icon}</span>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-white text-sm sm:text-base truncate">{api.name}</CardTitle>
                          <CardDescription className="text-gray-400 text-xs sm:text-sm line-clamp-2">
                            {api.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(api.status)}
                      </div>
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
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open('/whatsapp-config', '_blank');
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* APIs Saipos */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">PDVs Saipos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 lg:gap-4">
              {availableAPIs.filter(api => api.type === "saipos").map((api) => (
                <Card 
                  key={api.id} 
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 min-h-[120px] ${
                    api.status === "connected" 
                      ? "bg-[#001F05]/20 border-[#001F05]" 
                      : "bg-[#141415] border-[#374151]"
                  }`}
                  onClick={() => setSelectedAPI(api)}
                >
                  <CardHeader className="pb-3 p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-2xl flex-shrink-0">{api.icon}</span>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-white text-sm sm:text-base truncate">{api.name}</CardTitle>
                          <CardDescription className="text-gray-400 text-xs sm:text-sm line-clamp-2">
                            {api.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(api.status)}
                      </div>
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

          {/* APIs Personalizadas */}
          {customAPIs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">APIs Personalizadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
                {customAPIs.map((api) => (
                  <Card 
                    key={api.id} 
                    className={`cursor-pointer transition-all duration-200 hover:scale-105 min-h-[120px] ${
                      api.status === "connected" 
                        ? "bg-[#001F05]/20 border-[#001F05]" 
                        : "bg-[#141415] border-[#374151]"
                    }`}
                    onClick={() => setSelectedAPI(api)}
                  >
                    <CardHeader className="pb-3 p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-2xl flex-shrink-0">{api.icon}</span>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-white text-sm sm:text-base truncate">{api.name}</CardTitle>
                            <CardDescription className="text-gray-400 text-xs sm:text-sm line-clamp-2">
                              {api.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(api.status)}
                        </div>
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
          )}

          {/* Adicionar API Personalizada */}
          <Card className="bg-[#141415] border-[#374151] border-dashed">
            <CardContent className="p-6">
              {!showAddCustom ? (
                <div className="text-center">
                  <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-white font-medium mb-2">Adicionar PDV Personalizado</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Conecte outros PDVs ou sistemas personalizados
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-[#374151] text-white hover:bg-[#374151]"
                    onClick={() => setShowAddCustom(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar PDV
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  <h3 className="text-white font-medium">Novo PDV</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="api-name" className="text-white text-sm">Nome do PDV</Label>
                      <Input
                        id="api-name"
                        placeholder="Ex: PDV Loja Centro"
                        value={newAPIName}
                        onChange={(e) => setNewAPIName(e.target.value)}
                        className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-desc" className="text-white text-sm">Descrição</Label>
                      <Input
                        id="api-desc"
                        placeholder="Ex: Sistema de gestão da loja do centro"
                        value={newAPIDescription}
                        onChange={(e) => setNewAPIDescription(e.target.value)}
                        className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      onClick={handleAddCustomAPI}
                      disabled={!newAPIName.trim() || !newAPIDescription.trim()}
                      className="bg-[#001F05] hover:bg-[#001F05]/80 text-white flex-1 sm:flex-none"
                    >
                      Adicionar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddCustom(false);
                        setNewAPIName("");
                        setNewAPIDescription("");
                      }}
                      className="border-[#374151] text-white hover:bg-[#374151] flex-1 sm:flex-none"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração da API Selecionada */}
          {selectedAPI && (
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader className="p-4">
                <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-xl sm:text-2xl">{selectedAPI.icon}</span>
                  <span className="truncate">Configurar {selectedAPI.name}</span>
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  {selectedAPI.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div>
                  <Label htmlFor="api-key" className="text-white text-sm">Chave da API</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Insira sua chave da API"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] text-sm"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleConnect(selectedAPI)}
                    disabled={!apiKey || isConnecting}
                    className="bg-[#001F05] hover:bg-[#001F05]/80 text-white flex-1 sm:flex-none"
                  >
                    {isConnecting ? "Conectando..." : "Conectar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAPI(null)}
                    className="border-[#374151] text-white hover:bg-[#374151] flex-1 sm:flex-none"
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

