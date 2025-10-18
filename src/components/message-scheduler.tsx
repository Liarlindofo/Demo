"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagePresetService, MessagePreset, ScheduledMessage } from "@/lib/message-preset-service";
import { useNotification } from "@/components/ui/notification";
import { Plus, Calendar, Clock, Send, X, Edit } from "lucide-react";

export default function MessageScheduler() {
  const [presets, setPresets] = useState<MessagePreset[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState<ScheduledMessage | null>(null);
  const [formData, setFormData] = useState({
    presetId: '',
    customMessage: '',
    scheduledDate: '',
    scheduledTime: '',
    recipients: ''
  });
  const { showNotification, NotificationContainer } = useNotification();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allPresets = MessagePresetService.getAllPresets();
    const allScheduled = MessagePresetService.getAllScheduledMessages();
    setPresets(allPresets);
    setScheduledMessages(allScheduled);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scheduledDate || !formData.scheduledTime) {
      showNotification("Preencha a data e hora do agendamento", "error");
      return;
    }

    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    
    if (scheduledDateTime <= new Date()) {
      showNotification("A data e hora devem ser futuras", "error");
      return;
    }

    try {
      const selectedPreset = presets.find(p => p.id === formData.presetId);
      const message = formData.customMessage || selectedPreset?.message || '';
      
      if (!message.trim()) {
        showNotification("Selecione um preset ou digite uma mensagem personalizada", "error");
        return;
      }

      const scheduledData: Omit<ScheduledMessage, 'id' | 'createdAt'> = {
        presetId: formData.presetId || undefined,
        message,
        scheduledDate: scheduledDateTime,
        status: 'pending',
        recipients: formData.recipients ? formData.recipients.split(',').map(r => r.trim()) : undefined,
        customMessage: formData.customMessage || undefined
      };

      if (editingScheduled) {
        MessagePresetService.updateScheduledMessage(editingScheduled.id, scheduledData);
        showNotification("Mensagem agendada atualizada com sucesso!", "success");
      } else {
        MessagePresetService.createScheduledMessage(scheduledData);
        showNotification("Mensagem agendada com sucesso!", "success");
      }

      loadData();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao agendar mensagem:', error);
      showNotification("Erro ao agendar mensagem", "error");
    }
  };

  const handleEdit = (scheduled: ScheduledMessage) => {
    setEditingScheduled(scheduled);
    setFormData({
      presetId: scheduled.presetId || '',
      customMessage: scheduled.customMessage || '',
      scheduledDate: new Date(scheduled.scheduledDate).toISOString().split('T')[0],
      scheduledTime: new Date(scheduled.scheduledDate).toTimeString().slice(0, 5),
      recipients: scheduled.recipients?.join(', ') || ''
    });
    setIsDialogOpen(true);
  };

  const handleCancel = (id: string) => {
    MessagePresetService.updateScheduledMessage(id, { status: 'cancelled' });
    showNotification("Agendamento cancelado!", "success");
    loadData();
  };

  const resetForm = () => {
    setFormData({
      presetId: '',
      customMessage: '',
      scheduledDate: '',
      scheduledTime: '',
      recipients: ''
    });
    setEditingScheduled(null);
  };

  const getStatusColor = (status: ScheduledMessage['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'sent': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: ScheduledMessage['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'sent': return <Send className="h-3 w-3" />;
      case 'cancelled': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingMessages = scheduledMessages.filter(msg => msg.status === 'pending');
  const sentMessages = scheduledMessages.filter(msg => msg.status === 'sent');
  const cancelledMessages = scheduledMessages.filter(msg => msg.status === 'cancelled');

  return (
    <div className="space-y-6">
      <NotificationContainer />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Agendamento de Mensagens
          </h2>
          <p className="text-gray-400 mt-1">
            Agende mensagens para serem enviadas automaticamente
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-[#001F05] hover:bg-[#001F05]/80 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agendar Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141415] border-[#374151] text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingScheduled ? 'Editar Agendamento' : 'Agendar Nova Mensagem'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {editingScheduled ? 'Modifique as informações do agendamento' : 'Configure quando e o que enviar'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate" className="text-white">Data</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="bg-[#374151] border-[#6b7280] text-white focus:border-[#001F05]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime" className="text-white">Hora</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="bg-[#374151] border-[#6b7280] text-white focus:border-[#001F05]"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="presetId" className="text-white">Preset de Mensagem</Label>
                <Select
                  value={formData.presetId}
                  onValueChange={(value) => setFormData({ ...formData, presetId: value })}
                >
                  <SelectTrigger className="bg-[#374151] border-[#6b7280] text-white focus:border-[#001F05]">
                    <SelectValue placeholder="Selecione um preset (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#374151] border-[#6b7280]">
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customMessage" className="text-white">Mensagem Personalizada</Label>
                <Textarea
                  id="customMessage"
                  value={formData.customMessage}
                  onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                  placeholder="Digite sua mensagem personalizada ou deixe vazio para usar o preset selecionado..."
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] min-h-[120px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipients" className="text-white">Destinatários (opcional)</Label>
                <Input
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="Números separados por vírgula (ex: 11999999999, 11888888888)"
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                />
                <p className="text-xs text-gray-400">
                  Deixe vazio para enviar para todos os contatos
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-[#6b7280] text-gray-400 hover:bg-[#374151]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-[#001F05] hover:bg-[#001F05]/80 text-white"
                >
                  {editingScheduled ? 'Atualizar' : 'Agendar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#374151]">
          <TabsTrigger value="pending" className="data-[state=active]:bg-[#001F05]">
            Pendentes ({pendingMessages.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-[#001F05]">
            Enviadas ({sentMessages.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="data-[state=active]:bg-[#001F05]">
            Canceladas ({cancelledMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingMessages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMessages.map((scheduled) => (
                <Card key={scheduled.id} className="bg-[#141415] border-[#374151]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">
                          {presets.find(p => p.id === scheduled.presetId)?.name || 'Mensagem Personalizada'}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {formatDateTime(scheduled.scheduledDate)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(scheduled.status)}>
                        {getStatusIcon(scheduled.status)}
                        <span className="ml-1">Pendente</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="bg-[#374151] p-3 rounded-lg">
                      <p className="text-gray-300 text-sm line-clamp-3">
                        {scheduled.message}
                      </p>
                    </div>
                    
                    {scheduled.recipients && (
                      <div className="text-xs text-gray-400">
                        <strong>Destinatários:</strong> {scheduled.recipients.length} contato(s)
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(scheduled)}
                        className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(scheduled.id)}
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                Nenhuma mensagem pendente
              </h3>
              <p className="text-gray-500">
                Agende sua primeira mensagem para começar
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentMessages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sentMessages.map((scheduled) => (
                <Card key={scheduled.id} className="bg-[#141415] border-[#374151]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">
                          {presets.find(p => p.id === scheduled.presetId)?.name || 'Mensagem Personalizada'}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Enviada em {formatDateTime(scheduled.scheduledDate)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(scheduled.status)}>
                        {getStatusIcon(scheduled.status)}
                        <span className="ml-1">Enviada</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="bg-[#374151] p-3 rounded-lg">
                      <p className="text-gray-300 text-sm line-clamp-3">
                        {scheduled.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Send className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                Nenhuma mensagem enviada
              </h3>
              <p className="text-gray-500">
                As mensagens enviadas aparecerão aqui
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledMessages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cancelledMessages.map((scheduled) => (
                <Card key={scheduled.id} className="bg-[#141415] border-[#374151]">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">
                          {presets.find(p => p.id === scheduled.presetId)?.name || 'Mensagem Personalizada'}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          Cancelada em {formatDateTime(scheduled.scheduledDate)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(scheduled.status)}>
                        {getStatusIcon(scheduled.status)}
                        <span className="ml-1">Cancelada</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="bg-[#374151] p-3 rounded-lg">
                      <p className="text-gray-300 text-sm line-clamp-3">
                        {scheduled.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <X className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                Nenhuma mensagem cancelada
              </h3>
              <p className="text-gray-500">
                As mensagens canceladas aparecerão aqui
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
