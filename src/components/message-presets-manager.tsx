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
import { MessagePresetService, MessagePreset } from "@/lib/message-preset-service";
import { useNotification } from "@/components/ui/notification";
import { Plus, Edit, Trash2, Copy, Download, Upload, MessageSquare } from "lucide-react";

export default function MessagePresetsManager() {
  const [presets, setPresets] = useState<MessagePreset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<MessagePreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    category: 'promocional' as MessagePreset['category']
  });
  const { showNotification, NotificationContainer } = useNotification();

  useEffect(() => {
    loadPresets();
    // Inicializar presets padrão se não existirem
    MessagePresetService.initializeDefaultPresets();
    loadPresets();
  }, []);

  const loadPresets = () => {
    const allPresets = MessagePresetService.getAllPresets();
    setPresets(allPresets);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.message.trim()) {
      showNotification("Preencha todos os campos obrigatórios", "error");
      return;
    }

    try {
      if (editingPreset) {
        MessagePresetService.updatePreset(editingPreset.id, formData);
        showNotification("Preset atualizado com sucesso!", "success");
      } else {
        MessagePresetService.createPreset(formData);
        showNotification("Preset criado com sucesso!", "success");
      }

      loadPresets();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar preset:', error);
      showNotification("Erro ao salvar preset", "error");
    }
  };

  const handleEdit = (preset: MessagePreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      message: preset.message,
      category: preset.category
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este preset?")) {
      MessagePresetService.deletePreset(id);
      showNotification("Preset excluído com sucesso!", "success");
      loadPresets();
    }
  };

  const handleCopy = (message: string) => {
    navigator.clipboard.writeText(message);
    showNotification("Mensagem copiada para a área de transferência!", "success");
  };

  const resetForm = () => {
    setFormData({
      name: '',
      message: '',
      category: 'promocional'
    });
    setEditingPreset(null);
  };

  const handleExport = () => {
    const data = MessagePresetService.exportPresets();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drin-presets.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Presets exportados com sucesso!", "success");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as string;
        if (MessagePresetService.importPresets(data)) {
          showNotification("Presets importados com sucesso!", "success");
          loadPresets();
        } else {
          showNotification("Erro ao importar presets", "error");
        }
      } catch (error) {
        console.error('Erro ao importar presets:', error);
        showNotification("Arquivo inválido", "error");
      }
    };
    reader.readAsText(file);
  };

  const getCategoryIcon = (category: MessagePreset['category']) => {
    switch (category) {
      case 'promocional': return '🎉';
      case 'informativo': return '📢';
      case 'suporte': return '🛠️';
      case 'personalizado': return '✏️';
      default: return '📝';
    }
  };

  const getCategoryColor = (category: MessagePreset['category']) => {
    switch (category) {
      case 'promocional': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'informativo': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'suporte': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'personalizado': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <NotificationContainer />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Presets de Mensagens
          </h2>
          <p className="text-gray-400 mt-1">
            Gerencie suas mensagens pré-definidas para WhatsApp
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-[#001F05] text-[#001F05] hover:bg-[#001F05] hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          
          <label className="cursor-pointer">
            <Button
              variant="outline"
              className="border-[#001F05] text-[#001F05] hover:bg-[#001F05] hover:text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="bg-[#001F05] hover:bg-[#001F05]/80 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Preset
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#141415] border-[#374151] text-white">
              <DialogHeader>
                <DialogTitle>
                  {editingPreset ? 'Editar Preset' : 'Criar Novo Preset'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {editingPreset ? 'Modifique as informações do preset' : 'Crie um novo preset de mensagem'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Nome do Preset</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Promoção de Natal"
                    className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: MessagePreset['category']) => 
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="bg-[#374151] border-[#6b7280] text-white focus:border-[#001F05]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#374151] border-[#6b7280]">
                      <SelectItem value="promocional">🎉 Promocional</SelectItem>
                      <SelectItem value="informativo">📢 Informativo</SelectItem>
                      <SelectItem value="suporte">🛠️ Suporte</SelectItem>
                      <SelectItem value="personalizado">✏️ Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Digite sua mensagem aqui..."
                    className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] min-h-[200px]"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Use variáveis como {'{nome_cliente}'}, {'{produto}'}, {'{valor}'} para personalização
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
                    {editingPreset ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <Card key={preset.id} className="bg-[#141415] border-[#374151] hover:border-[#001F05]/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(preset.category)}</span>
                  <CardTitle className="text-white text-lg">{preset.name}</CardTitle>
                </div>
                <Badge className={getCategoryColor(preset.category)}>
                  {preset.category}
                </Badge>
              </div>
              <CardDescription className="text-gray-400 text-sm">
                Criado em {new Date(preset.createdAt).toLocaleDateString('pt-BR')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="bg-[#374151] p-3 rounded-lg">
                <p className="text-gray-300 text-sm line-clamp-4">
                  {preset.message}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(preset.message)}
                  className="flex-1 border-[#001F05] text-[#001F05] hover:bg-[#001F05] hover:text-white"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(preset)}
                  className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(preset.id)}
                  className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {presets.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Nenhum preset encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Crie seu primeiro preset de mensagem para começar
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#001F05] hover:bg-[#001F05]/80 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Preset
          </Button>
        </div>
      )}
    </div>
  );
}
