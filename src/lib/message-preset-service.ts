export interface MessagePreset {
  id: string;
  name: string;
  message: string;
  category: 'promocional' | 'informativo' | 'suporte' | 'personalizado';
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledMessage {
  id: string;
  presetId?: string;
  message: string;
  scheduledDate: Date;
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Date;
  recipients?: string[];
  customMessage?: string;
}

export class MessagePresetService {
  private static readonly PRESETS_KEY = 'drin_message_presets';
  private static readonly SCHEDULED_KEY = 'drin_scheduled_messages';

  // ===== PRESETS MANAGEMENT =====

  static getAllPresets(): MessagePreset[] {
    try {
      const presets = localStorage.getItem(this.PRESETS_KEY);
      return presets ? JSON.parse(presets) : [];
    } catch (error) {
      console.error('Erro ao carregar presets:', error);
      return [];
    }
  }

  static getPresetById(id: string): MessagePreset | null {
    const presets = this.getAllPresets();
    return presets.find(preset => preset.id === id) || null;
  }

  static createPreset(preset: Omit<MessagePreset, 'id' | 'createdAt' | 'updatedAt'>): MessagePreset {
    const newPreset: MessagePreset = {
      ...preset,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const presets = this.getAllPresets();
    presets.push(newPreset);
    this.savePresets(presets);

    return newPreset;
  }

  static updatePreset(id: string, updates: Partial<Omit<MessagePreset, 'id' | 'createdAt'>>): MessagePreset | null {
    const presets = this.getAllPresets();
    const index = presets.findIndex(preset => preset.id === id);

    if (index === -1) return null;

    presets[index] = {
      ...presets[index],
      ...updates,
      updatedAt: new Date()
    };

    this.savePresets(presets);
    return presets[index];
  }

  static deletePreset(id: string): boolean {
    const presets = this.getAllPresets();
    const filteredPresets = presets.filter(preset => preset.id !== id);
    
    if (filteredPresets.length === presets.length) return false;

    this.savePresets(filteredPresets);
    return true;
  }

  static getPresetsByCategory(category: MessagePreset['category']): MessagePreset[] {
    const presets = this.getAllPresets();
    return presets.filter(preset => preset.category === category);
  }

  // ===== SCHEDULED MESSAGES MANAGEMENT =====

  static getAllScheduledMessages(): ScheduledMessage[] {
    try {
      const scheduled = localStorage.getItem(this.SCHEDULED_KEY);
      return scheduled ? JSON.parse(scheduled) : [];
    } catch (error) {
      console.error('Erro ao carregar mensagens agendadas:', error);
      return [];
    }
  }

  static getScheduledMessageById(id: string): ScheduledMessage | null {
    const scheduled = this.getAllScheduledMessages();
    return scheduled.find(msg => msg.id === id) || null;
  }

  static createScheduledMessage(scheduled: Omit<ScheduledMessage, 'id' | 'createdAt'>): ScheduledMessage {
    const newScheduled: ScheduledMessage = {
      ...scheduled,
      id: this.generateId(),
      createdAt: new Date()
    };

    const scheduledMessages = this.getAllScheduledMessages();
    scheduledMessages.push(newScheduled);
    this.saveScheduledMessages(scheduledMessages);

    return newScheduled;
  }

  static updateScheduledMessage(id: string, updates: Partial<Omit<ScheduledMessage, 'id' | 'createdAt'>>): ScheduledMessage | null {
    const scheduledMessages = this.getAllScheduledMessages();
    const index = scheduledMessages.findIndex(msg => msg.id === id);

    if (index === -1) return null;

    scheduledMessages[index] = {
      ...scheduledMessages[index],
      ...updates
    };

    this.saveScheduledMessages(scheduledMessages);
    return scheduledMessages[index];
  }

  static deleteScheduledMessage(id: string): boolean {
    const scheduledMessages = this.getAllScheduledMessages();
    const filteredMessages = scheduledMessages.filter(msg => msg.id !== id);
    
    if (filteredMessages.length === scheduledMessages.length) return false;

    this.saveScheduledMessages(filteredMessages);
    return true;
  }

  static getPendingMessages(): ScheduledMessage[] {
    const scheduledMessages = this.getAllScheduledMessages();
    return scheduledMessages.filter(msg => 
      msg.status === 'pending' && 
      new Date(msg.scheduledDate) > new Date()
    );
  }

  static getMessagesByStatus(status: ScheduledMessage['status']): ScheduledMessage[] {
    const scheduledMessages = this.getAllScheduledMessages();
    return scheduledMessages.filter(msg => msg.status === status);
  }

  // ===== UTILITY METHODS =====

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static savePresets(presets: MessagePreset[]): void {
    try {
      localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Erro ao salvar presets:', error);
    }
  }

  private static saveScheduledMessages(scheduledMessages: ScheduledMessage[]): void {
    try {
      localStorage.setItem(this.SCHEDULED_KEY, JSON.stringify(scheduledMessages));
    } catch (error) {
      console.error('Erro ao salvar mensagens agendadas:', error);
    }
  }

  // ===== INITIAL DATA =====

  static initializeDefaultPresets(): void {
    const existingPresets = this.getAllPresets();
    
    if (existingPresets.length > 0) return;

    const defaultPresets: Omit<MessagePreset, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Promoção Especial',
        message: '🎉 *PROMOÇÃO ESPECIAL!* 🎉\n\nAproveite nossa oferta exclusiva:\n• Desconto de 20% em todos os produtos\n• Frete grátis para pedidos acima de R$ 50\n• Válido até o final do mês\n\nFaça seu pedido agora! 📱\n\n_*Drin Platform*_',
        category: 'promocional'
      },
      {
        name: 'Pedido Confirmado',
        message: '✅ *Pedido Confirmado!*\n\nOlá! Seu pedido foi recebido e está sendo preparado.\n\n📋 *Detalhes do pedido:*\n• Número: #{numero_pedido}\n• Valor: R$ {valor_total}\n• Previsão de entrega: {tempo_entrega}\n\nVocê receberá atualizações sobre o status do seu pedido.\n\nObrigado pela preferência! 🙏\n\n_*Drin Platform*_',
        category: 'informativo'
      },
      {
        name: 'Pedido Enviado',
        message: '🚚 *Pedido Enviado!*\n\nSeu pedido está a caminho!\n\n📦 *Informações de entrega:*\n• Código de rastreamento: {codigo_rastreamento}\n• Previsão de entrega: {previsao_entrega}\n• Entregador: {nome_entregador}\n• Telefone: {telefone_entregador}\n\nAcompanhe seu pedido em tempo real!\n\n_*Drin Platform*_',
        category: 'informativo'
      },
      {
        name: 'Suporte Técnico',
        message: '🛠️ *Suporte Técnico*\n\nOlá! Como podemos ajudá-lo hoje?\n\nNossa equipe de suporte está disponível para:\n• Dúvidas sobre produtos\n• Problemas com pedidos\n• Informações sobre entregas\n• Suporte técnico\n\nResponderemos em até 2 horas úteis.\n\n_*Drin Platform*_',
        category: 'suporte'
      },
      {
        name: 'Boas-vindas',
        message: '👋 *Bem-vindo à nossa plataforma!*\n\nFicamos felizes em tê-lo conosco!\n\nAqui você encontrará:\n• Produtos de qualidade\n• Atendimento personalizado\n• Entregas rápidas\n• Ofertas exclusivas\n\nExplore nosso catálogo e faça seu primeiro pedido!\n\n_*Drin Platform*_',
        category: 'informativo'
      },
      {
        name: 'Lembrete de Carrinho',
        message: '🛒 *Você esqueceu algo no carrinho!*\n\nOlá! Notamos que você deixou itens no seu carrinho.\n\n📋 *Itens pendentes:*\n{lista_produtos}\n\n💰 *Total:* R$ {valor_total}\n\nComplete sua compra agora e aproveite!\n\n_*Drin Platform*_',
        category: 'promocional'
      }
    ];

    defaultPresets.forEach(preset => {
      this.createPreset(preset);
    });
  }

  // ===== EXPORT/IMPORT =====

  static exportPresets(): string {
    const presets = this.getAllPresets();
    return JSON.stringify(presets, null, 2);
  }

  static importPresets(jsonData: string): boolean {
    try {
      const presets = JSON.parse(jsonData);
      if (Array.isArray(presets)) {
        this.savePresets(presets);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao importar presets:', error);
      return false;
    }
  }

  static exportScheduledMessages(): string {
    const scheduled = this.getAllScheduledMessages();
    return JSON.stringify(scheduled, null, 2);
  }

  static importScheduledMessages(jsonData: string): boolean {
    try {
      const scheduled = JSON.parse(jsonData);
      if (Array.isArray(scheduled)) {
        this.saveScheduledMessages(scheduled);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao importar mensagens agendadas:', error);
      return false;
    }
  }
}

export default MessagePresetService;
