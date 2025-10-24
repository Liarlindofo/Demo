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
  private retryTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, (data: RealtimeUpdate) => void> = new Map();

  constructor(config: RealtimeConfig) {
    this.config = {
      retryInterval: 5000,
      maxRetries: 10,
      ...config
    };
  }

  // Conectar ao stream de dados em tempo real
  connect(storeId: string): void {
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  // Gerenciar reconexão automática
  private handleReconnection(): void {
    if (this.retryCount < this.config.maxRetries!) {
      this.retryCount++;
      console.log(`🔄 Tentativa de reconexão ${this.retryCount}/${this.config.maxRetries}`);
      
      this.retryTimeout = setTimeout(() => {
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
    const mockData: RealtimeUpdate[] = [
      {
        storeId,
        type: 'sales',
        data: { totalSales: 2500, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      },
      {
        storeId,
        type: 'orders',
        data: { totalOrders: 48, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      },
      {
        storeId,
        type: 'customers',
        data: { uniqueCustomers: 24, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      }
    ];

    // Simular atualizações a cada 10 segundos
    const interval = setInterval(() => {
      const randomUpdate = mockData[Math.floor(Math.random() * mockData.length)];
      randomUpdate.timestamp = new Date().toISOString();
      this.notifyListeners(randomUpdate);
    }, 10000);

    // Limpar interval quando desconectar
    const originalDisconnect = this.disconnect.bind(this);
    this.disconnect = () => {
      clearInterval(interval);
      originalDisconnect();
    };
  }
}

// Instância global do serviço
export const realtimeService = new RealtimeService({
  baseUrl: process.env.NEXT_PUBLIC_SAIPOS_BASE_URL || 'https://api.saipos.com',
  apiKey: process.env.NEXT_PUBLIC_SAIPOS_API_KEY || '',
});

export default RealtimeService;
