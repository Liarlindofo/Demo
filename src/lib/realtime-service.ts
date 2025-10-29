// Serviço de sincronização em tempo real para dados da Saipos

export interface RealtimeUpdate {
  storeId: string;
  type: 'sales' | 'orders' | 'customers' | 'products';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface RealtimeConfig {
  baseUrl: string;
  apiKey: string;
  retryInterval?: number;
  maxRetries?: number;
}

class RealtimeService {
  private config: RealtimeConfig;
  private eventSource: EventSource | null = null;
  private retryCount = 0;
  private retryTimeout: number | null = null;
  private mockInterval: number | null = null;
  private listeners: Map<string, (data: RealtimeUpdate) => void> = new Map();
  private pollingInterval: number | null = null;

  constructor(config: RealtimeConfig) {
    this.config = {
      retryInterval: 5000,
      maxRetries: 10,
      ...config
    };
  }

  // Conectar ao stream de dados em tempo real
  connect(storeId: string): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') {
      console.log('⚠️ connect chamado no servidor, ignorando...');
      return;
    }

    if (this.eventSource) {
      this.disconnect();
    }

    const url = `${this.config.baseUrl}/api/realtime/stream?storeId=${storeId}&apiKey=${this.config.apiKey}`;
    
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('✅ Conexão em tempo real estabelecida');
      this.retryCount = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const update: RealtimeUpdate = JSON.parse(event.data);
        this.notifyListeners(update);
      } catch (error) {
        console.error('Erro ao processar dados em tempo real:', error);
      }
    };

    this.eventSource.onerror = () => {
      console.error('❌ Erro na conexão em tempo real');
      this.handleReconnection();
    };
  }

  // Desconectar do stream
  disconnect(): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') {
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Gerenciar reconexão automática
  private handleReconnection(): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') {
      return;
    }

    if (this.retryCount < this.config.maxRetries!) {
      this.retryCount++;
      console.log(`🔄 Tentativa de reconexão ${this.retryCount}/${this.config.maxRetries}`);
      
      this.retryTimeout = window.setTimeout(() => {
        this.connect(this.getCurrentStoreId());
      }, this.config.retryInterval);
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
    }
  }

  // Obter store ID atual (implementação simplificada)
  private getCurrentStoreId(): string {
    // Em uma implementação real, isso viria do contexto da aplicação
    return '1';
  }

  // Adicionar listener para atualizações
  subscribe(listenerId: string, callback: (data: RealtimeUpdate) => void): void {
    this.listeners.set(listenerId, callback);
  }

  // Remover listener
  unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  // Notificar todos os listeners
  private notifyListeners(update: RealtimeUpdate): void {
    this.listeners.forEach((callback) => {
      try {
        callback(update);
      } catch (error) {
        console.error('Erro ao notificar listener:', error);
      }
    });
  }

  // Simular dados em tempo real para desenvolvimento
  startMockUpdates(storeId: string): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') {
      console.log('⚠️ startMockUpdates chamado no servidor, ignorando...');
      return;
    }

    console.log(`🚀 Iniciando mock de atualizações em tempo real para a loja: ${storeId}`);
    
    // Limpar interval anterior se existir
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }

    // Simular atualizações a cada 5 segundos
    this.mockInterval = window.setInterval(() => {
      const updateType = ['sales', 'orders', 'customers'][Math.floor(Math.random() * 3)];
      let updateData: Record<string, unknown> = {};

      switch (updateType) {
        case 'sales':
          updateData = { 
            totalSales: Math.floor(Math.random() * 1000) + 2000,
            timestamp: new Date().toISOString()
          };
          break;
        case 'orders':
          updateData = { 
            totalOrders: Math.floor(Math.random() * 50) + 30,
            timestamp: new Date().toISOString()
          };
          break;
        case 'customers':
          updateData = { 
            uniqueCustomers: Math.floor(Math.random() * 20) + 10,
            timestamp: new Date().toISOString()
          };
          break;
      }

      const update: RealtimeUpdate = {
        storeId,
        type: updateType as 'sales' | 'orders' | 'customers',
        data: updateData,
        timestamp: new Date().toISOString(),
      };

      console.log(`📊 Enviando atualização ${updateType}:`, update);
      this.notifyListeners(update);
    }, 5000); // Envia uma atualização a cada 5 segundos
  }

  // Polling (fallback) a cada N ms
  startPolling(fetchUpdate: () => Promise<RealtimeUpdate>, intervalMs = 60000): void {
    // Verificar se estamos no lado do cliente
    if (typeof window === 'undefined') {
      console.log('⚠️ startPolling chamado no servidor, ignorando...');
      return;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    const run = async () => {
      try {
        const update = await fetchUpdate();
        this.notifyListeners(update);
      } catch (error) {
        console.error('Erro no polling de dados:', error);
      }
    };

    // Executa imediatamente e agenda intervalos
    run();
    this.pollingInterval = window.setInterval(run, intervalMs);
  }

  stopPolling(): void {
    if (typeof window === 'undefined') return;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// Instância global do serviço
export const realtimeService = new RealtimeService({
  baseUrl: process.env.NEXT_PUBLIC_SAIPOS_BASE_URL || 'https://api.saipos.com',
  apiKey: process.env.NEXT_PUBLIC_SAIPOS_API_KEY || '',
});

export default RealtimeService;
