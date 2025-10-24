// Serviço para integração com a API da Saipos
export interface SaiposConfig {
  apiKey: string;
  baseUrl: string;
  storeId?: string;
}

export interface SaiposSalesData {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  uniqueCustomers: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface SaiposStore {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
}

class SaiposAPIService {
  private config: SaiposConfig;

  constructor(config: SaiposConfig) {
    this.config = config;
  }

  // Método para testar a conexão com a API
  async testConnection(): Promise<boolean> {
    try {
      // Para desenvolvimento, sempre retornar true
      console.log('🔗 Simulando conexão bem-sucedida com Saipos');
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return true;
    } catch (error) {
      console.error('Erro ao testar conexão com Saipos:', error);
      return false;
    }
  }

  // Método para obter dados de vendas
  async getSalesData(_startDate: string, _endDate: string): Promise<SaiposSalesData[]> {
    try {
      // Para desenvolvimento, sempre retornar dados mockados
      console.log('📊 Usando dados mockados para desenvolvimento');
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Retornar dados mockados
      return [
        { date: "2025-01-01", totalSales: 4000, totalOrders: 240, averageTicket: 16.67, uniqueCustomers: 180, topProducts: [] },
        { date: "2025-01-02", totalSales: 3000, totalOrders: 139, averageTicket: 21.58, uniqueCustomers: 120, topProducts: [] },
        { date: "2025-01-03", totalSales: 2000, totalOrders: 98, averageTicket: 20.41, uniqueCustomers: 85, topProducts: [] },
        { date: "2025-01-04", totalSales: 2780, totalOrders: 139, averageTicket: 20.00, uniqueCustomers: 110, topProducts: [] },
        { date: "2025-01-05", totalSales: 1890, totalOrders: 95, averageTicket: 19.89, uniqueCustomers: 75, topProducts: [] },
        { date: "2025-01-06", totalSales: 2390, totalOrders: 120, averageTicket: 19.92, uniqueCustomers: 90, topProducts: [] },
      ];
    } catch (error) {
      console.error('Erro ao obter dados de vendas:', error);
      throw error;
    }
  }

  // Método para obter lista de lojas
  async getStores(): Promise<SaiposStore[]> {
    try {
      // Para desenvolvimento, sempre retornar dados mockados
      console.log('🏪 Usando dados mockados para lojas');
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Retornar dados mockados
      return [
        { id: "1", name: "Restaurante Central", address: "Rua Principal, 123", phone: "(11) 99999-9999", status: 'active' },
        { id: "2", name: "Pizzaria do João", address: "Av. Comercial, 456", phone: "(11) 88888-8888", status: 'active' },
        { id: "3", name: "Lanchonete Express", address: "Rua das Flores, 789", phone: "(11) 77777-7777", status: 'active' }
      ];
    } catch (error) {
      console.error('Erro ao obter lojas:', error);
      throw error;
    }
  }

  // Método para obter dados em tempo real
  async getRealTimeData(): Promise<SaiposSalesData> {
    try {
      // Para desenvolvimento, sempre retornar dados mockados
      console.log('⚡ Usando dados mockados para tempo real');
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Retornar dados mockados
      return {
        date: new Date().toISOString().split('T')[0],
        totalSales: Math.floor(Math.random() * 2000) + 1000,
        totalOrders: Math.floor(Math.random() * 50) + 20,
        averageTicket: Math.floor(Math.random() * 30) + 20,
        uniqueCustomers: Math.floor(Math.random() * 30) + 10,
        topProducts: [
          { name: "Produto A", quantity: Math.floor(Math.random() * 20) + 5, revenue: Math.floor(Math.random() * 200) + 100 },
          { name: "Produto B", quantity: Math.floor(Math.random() * 15) + 3, revenue: Math.floor(Math.random() * 150) + 80 },
          { name: "Produto C", quantity: Math.floor(Math.random() * 10) + 2, revenue: Math.floor(Math.random() * 100) + 50 }
        ]
      };
    } catch (error) {
      console.error('Erro ao obter dados em tempo real:', error);
      throw error;
    }
  }

  // Método para obter relatório diário
  async getDailyReport(date: string): Promise<SaiposSalesData> {
    try {
      // Para desenvolvimento, sempre retornar dados mockados
      console.log('📊 Usando dados mockados para relatório diário');
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Retornar dados mockados
      return {
        date: date,
        totalSales: 2450,
        totalOrders: 47,
        averageTicket: 52.13,
        uniqueCustomers: 23,
        topProducts: [
          { name: "Pizza Margherita", quantity: 12, revenue: 240 },
          { name: "Hambúrguer Clássico", quantity: 8, revenue: 160 },
          { name: "Coca-Cola", quantity: 15, revenue: 75 }
        ]
      };
    } catch (error) {
      console.error('Erro ao obter relatório diário:', error);
      throw error;
    }
  }
}

// Instância padrão do serviço (você pode configurar com suas credenciais)
export const saiposAPI = new SaiposAPIService({
  apiKey: process.env.NEXT_PUBLIC_SAIPOS_API_KEY || '',
  baseUrl: process.env.NEXT_PUBLIC_SAIPOS_BASE_URL || 'https://api.saipos.com',
});

export default SaiposAPIService;
