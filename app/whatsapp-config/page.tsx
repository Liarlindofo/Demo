"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  QrCode, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Smartphone,
  Send,
  Calendar,
  Settings
} from "lucide-react";
import { AppProvider, useApp } from "@/contexts/app-context";
import { ToastManager } from "@/components/notification-toast";
import Image from "next/image";

function WhatsAppConfigContent() {
  const { addToast, toasts, removeToast } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [, setConnectionStep] = useState<'scan' | 'connected' | 'config'>('scan');
  
  // Form states
  const [messageTemplate, setMessageTemplate] = useState(`📊 *Relatório Diário*

🏪 *Loja:* {{storeName}}
📅 *Data:* {{date}}
💰 *Vendas:* R$ {{totalSales}}
👥 *Clientes:* {{totalCustomers}}
📈 *Crescimento:* {{growth}}%

🎯 *Top Produtos:*
{{topProducts}}

📋 *Resumo:* {{summary}}`);
  
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDays, setScheduleDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [groupName, setGroupName] = useState('');

  const handleConnectWhatsApp = () => {
    addToast("Gerando QR Code para conexão...", "info");
    // Simular geração de QR Code
    setTimeout(() => {
      setQrCode("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJibGFjayIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UVIgQ29kZSBQbGFjZWhvbGRlcjwvdGV4dD4KPC9zdmc+");
      setConnectionStep('scan');
    }, 1000);
  };

  const handleQRScanned = () => {
    addToast("WhatsApp conectado com sucesso!", "success");
    setIsConnected(true);
    setConnectionStep('connected');
    setTimeout(() => {
      setConnectionStep('config');
    }, 2000);
  };

  const handleSaveConfig = () => {
    addToast("Configuração salva com sucesso!", "success");
    // Aqui você salvaria as configurações
  };

  const handleTestMessage = () => {
    addToast("Mensagem de teste enviada!", "success");
  };

  const daysOptions = [
    { value: 'monday', label: 'Segunda' },
    { value: 'tuesday', label: 'Terça' },
    { value: 'wednesday', label: 'Quarta' },
    { value: 'thursday', label: 'Quinta' },
    { value: 'friday', label: 'Sexta' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Image src="/whatsapp-logo.svg" alt="WhatsApp" width={32} height={32} className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Configuração do WhatsApp</h1>
          </div>
          <p className="text-gray-400">
            Configure o envio automático de relatórios para grupos do WhatsApp
          </p>
        </div>

        {/* Connection Status */}
        <Card className="bg-[#141415] border-[#374151] mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {isConnected ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="text-green-500 font-medium">WhatsApp Conectado</p>
                    <p className="text-sm text-gray-400">Pronto para enviar mensagens</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                  <div>
                    <p className="text-yellow-500 font-medium">WhatsApp Desconectado</p>
                    <p className="text-sm text-gray-400">Conecte seu WhatsApp para começar</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#141415] border-[#374151]">
            <TabsTrigger value="connection" className="data-[state=active]:bg-[#374151]">
              <QrCode className="w-4 h-4 mr-2" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="message" className="data-[state=active]:bg-[#374151]">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagem
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-[#374151]">
              <Clock className="w-4 h-4 mr-2" />
              Agendamento
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="mt-6">
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle>Conectar WhatsApp</CardTitle>
                <CardDescription>
                  Escaneie o QR Code com seu WhatsApp para conectar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isConnected ? (
                  <div className="text-center">
                    {qrCode ? (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <Image 
                            src={qrCode} 
                            alt="QR Code" 
                            width={200}
                            height={200}
                            className="border-2 border-white rounded-lg p-4 bg-white"
                          />
                        </div>
                        <p className="text-sm text-gray-400">
                          Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
                        </p>
                        <Button onClick={handleQRScanned} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Simular Leitura do QR
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleConnectWhatsApp} className="bg-green-600 hover:bg-green-700">
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar QR Code
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">WhatsApp Conectado!</h3>
                    <p className="text-gray-400">Agora você pode configurar o envio de mensagens</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message Template Tab */}
          <TabsContent value="message" className="mt-6">
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle>Template da Mensagem</CardTitle>
                <CardDescription>
                  Configure como as mensagens de relatório serão enviadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nome do Grupo</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Digite o nome do grupo do WhatsApp"
                    className="bg-[#374151] border-[#6b7280] text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="messageTemplate">Template da Mensagem</Label>
                  <Textarea
                    id="messageTemplate"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    rows={12}
                    className="bg-[#374151] border-[#6b7280] text-white font-mono text-sm"
                    placeholder="Digite o template da mensagem..."
                  />
                  <p className="text-xs text-gray-400">
                    Use variáveis como: {`{{storeName}}`}, {`{{date}}`}, {`{{totalSales}}`}, {`{{totalCustomers}}`}, {`{{growth}}`}, {`{{topProducts}}`}, {`{{summary}}`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleTestMessage} variant="outline" className="border-[#374151] text-white hover:bg-[#374151]">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Teste
                  </Button>
                  <Button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Salvar Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-6">
            <Card className="bg-[#141415] border-[#374151]">
              <CardHeader>
                <CardTitle>Agendamento</CardTitle>
                <CardDescription>
                  Configure quando as mensagens serão enviadas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="scheduleTime">Horário de Envio</Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-[#374151] border-[#6b7280] text-white w-48"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {daysOptions.map((day) => (
                      <Badge
                        key={day.value}
                        variant={scheduleDays.includes(day.value) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          scheduleDays.includes(day.value)
                            ? "bg-green-600 text-white"
                            : "border-[#374151] text-gray-400 hover:bg-[#374151]"
                        }`}
                        onClick={() => {
                          if (scheduleDays.includes(day.value)) {
                            setScheduleDays(scheduleDays.filter(d => d !== day.value));
                          } else {
                            setScheduleDays([...scheduleDays, day.value]);
                          }
                        }}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator className="bg-[#374151]" />

                <div className="space-y-4">
                  <h4 className="font-medium">Próximos Envios</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-[#374151] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span>Segunda-feira, 14/10/2025 às 09:00</span>
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        Ativo
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#374151] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <span>Terça-feira, 15/10/2025 às 09:00</span>
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        Ativo
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveConfig} className="bg-green-600 hover:bg-green-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Salvar Agendamento
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Toast Notifications */}
      <ToastManager 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
    </div>
  );
}

export default function WhatsAppConfigPage() {
  return (
    <AppProvider>
      <WhatsAppConfigContent />
    </AppProvider>
  );
}







