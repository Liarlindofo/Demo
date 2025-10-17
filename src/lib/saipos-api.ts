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
      const response = await fetch(`${this.config.baseUrl}/api/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao testar conexão com Saipos:', error);
      return false;
    }
  }

  // Método para obter dados de vendas
  async getSalesData(startDate: string, endDate: string): Promise<SaiposSalesData[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/api/sales?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao obter dados de vendas:', error);
      throw error;
    }
  }

  // Método para obter lista de lojas
  async getStores(): Promise<SaiposStore[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/stores`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao obter lojas:', error);
      throw error;
    }
  }

  // Método para obter dados em tempo real
  async getRealTimeData(): Promise<SaiposSalesData> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/realtime`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao obter dados em tempo real:', error);
      throw error;
    }
  }

  // Método para obter relatório diário
  async getDailyReport(date: string): Promise<SaiposSalesData> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/reports/daily?date=${date}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      return data;
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
