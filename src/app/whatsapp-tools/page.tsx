"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MessagePresetsManager from "@/components/message-presets-manager";
import MessageScheduler from "@/components/message-scheduler";
import { MessageSquare, Calendar, Settings } from "lucide-react";

export default function WhatsAppToolsPage() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Ferramentas WhatsApp
          </h1>
          <p className="text-gray-400">
            Gerencie presets de mensagens e agendamentos para WhatsApp
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#374151] mb-6">
            <TabsTrigger 
              value="presets" 
              className="data-[state=active]:bg-[#001F05] flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Presets de Mensagens
            </TabsTrigger>
            <TabsTrigger 
              value="scheduler" 
              className="data-[state=active]:bg-[#001F05] flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Agendamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-6">
            <MessagePresetsManager />
          </TabsContent>

          <TabsContent value="scheduler" className="space-y-6">
            <MessageScheduler />
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <div className="mt-8 bg-[#141415] border border-[#374151] rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[#001F05] p-3 rounded-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Como Funciona
              </h3>
              <div className="space-y-2 text-gray-400">
                <p>
                  <strong className="text-white">Presets:</strong> Crie e gerencie mensagens pré-definidas 
                  que podem ser reutilizadas facilmente.
                </p>
                <p>
                  <strong className="text-white">Agendamento:</strong> Programe mensagens para serem enviadas 
                  em datas e horários específicos.
                </p>
                <p>
                  <strong className="text-white">Armazenamento Local:</strong> Todos os dados são salvos no 
                  localStorage do seu navegador, garantindo privacidade e acesso offline.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
