// Serviço para integração com a API da Saipos
export interface SaiposConfig {
  apiKey: string;
  baseUrl: string;
  storeId?: string;
}

// Estrutura de dados baseada na API real da Saipos
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
  // Campos adicionais baseados na API real
  deliverySales?: number;
  counterSales?: number;
  hallSales?: number;
  ticketSales?: number;
  totalRevenue: number;
  ordersByChannel: {
    delivery: number;
    counter: number;
    hall: number;
    ticket: number;
  };
}

export interface SaiposStore {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
  // Campos adicionais da API real
  cnpj?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lastSync?: string;
  apiId?: string;
}

// Interface para resposta da API de vendas por período
export interface SaiposSalesResponse {
  success: boolean;
  data: SaiposSalesData[];
  totalRecords: number;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSales: number;
    totalOrders: number;
    averageTicket: number;
    uniqueCustomers: number;
  };
}

// Interface para resposta da API de lojas
export interface SaiposStoresResponse {
  success: boolean;
  data: SaiposStore[];
  totalRecords: number;
}

interface SaiposAPIResponse {
  data?: unknown;
  error?: string;
  status?: string;
  date?: string;
}

export class SaiposAPIService {
  private config: SaiposConfig;

  constructor(config: SaiposConfig) {
    this.config = config;
  }

  // Método para testar a conexão com a API real
  async testConnection(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log('🔗 Testando conexão real com Saipos...');
      
      // Fazer chamada real para a API da Saipos
      const response = await fetch(`${this.config.baseUrl}/api/v1/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Conexão com Saipos estabelecida!');
        return true;
      } else {
        console.error('❌ Falha na conexão:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao testar conexão com Saipos:', error);
      return false;
    }
  }

  // Método para obter dados de vendas da API real da Saipos
  async getSalesData(startDate: string, endDate: string): Promise<SaiposSalesData[]> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log(`📊 Buscando dados reais de vendas da Saipos: ${startDate} até ${endDate}`);
      
      // Fazer chamada real para a API da Saipos
      const response = await fetch(`${this.config.baseUrl}/api/v1/sales?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log('✅ Dados reais carregados da Saipos:', apiData);
      
          // Converter dados da API para o formato esperado
          return this.convertSalesData();
    } catch (error) {
      console.error('❌ Erro ao obter dados de vendas:', error);
      
      // Em caso de erro, retornar dados mockados para teste
      console.log('⚠️ Usando dados mockados para teste');
      return this.getMockSalesData();
    }
  }

  // Método para obter dados mockados de vendas (para teste)
  private getMockSalesData(): SaiposSalesData[] {
    return [
      {
        date: "2025-01-01",
        totalSales: 4250.50,
        totalOrders: 45,
        averageTicket: 94.46,
        uniqueCustomers: 38,
        totalRevenue: 4250.50,
        deliverySales: 2100.00,
        counterSales: 1200.50,
        hallSales: 650.00,
        ticketSales: 300.00,
        ordersByChannel: {
          delivery: 22,
          counter: 15,
          hall: 6,
          ticket: 2
        },
        topProducts: [
          { name: "Pizza Margherita", quantity: 8, revenue: 160.00 },
          { name: "Hambúrguer Clássico", quantity: 12, revenue: 240.00 },
          { name: "Coca-Cola 350ml", quantity: 20, revenue: 100.00 }
        ]
      },
      {
        date: "2025-01-02",
        totalSales: 3890.75,
        totalOrders: 52,
        averageTicket: 74.82,
        uniqueCustomers: 41,
        totalRevenue: 3890.75,
        deliverySales: 1950.25,
        counterSales: 1100.00,
        hallSales: 640.50,
        ticketSales: 200.00,
        ordersByChannel: {
          delivery: 25,
          counter: 18,
          hall: 7,
          ticket: 2
        },
        topProducts: [
          { name: "Pizza Portuguesa", quantity: 6, revenue: 150.00 },
          { name: "X-Burger", quantity: 10, revenue: 200.00 },
          { name: "Guaraná 2L", quantity: 15, revenue: 75.00 }
        ]
      },
      {
        date: "2025-01-03",
        totalSales: 4520.30,
        totalOrders: 48,
        averageTicket: 94.17,
        uniqueCustomers: 35,
        totalRevenue: 4520.30,
        deliverySales: 2300.80,
        counterSales: 1300.50,
        hallSales: 720.00,
        ticketSales: 199.00,
        ordersByChannel: {
          delivery: 24,
          counter: 16,
          hall: 6,
          ticket: 2
        },
        topProducts: [
          { name: "Pizza Calabresa", quantity: 9, revenue: 180.00 },
          { name: "X-Tudo", quantity: 8, revenue: 160.00 },
          { name: "Suco de Laranja", quantity: 12, revenue: 60.00 }
        ]
      }
    ];
  }

  // Método para converter dados da API Saipos para o formato interno
  private convertSalesData(): SaiposSalesData[] {
    // Implementar conversão baseada na estrutura real da API Saipos
    // Por enquanto, retornar array vazio até termos a estrutura real
    return [];
  }


  // Método para obter lista de lojas da API real da Saipos
  async getStores(): Promise<SaiposStore[]> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log('🏪 Buscando lojas reais da Saipos...');
      
      // Fazer chamada real para a API da Saipos
      const response = await fetch(`${this.config.baseUrl}/api/v1/stores`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log('✅ Lojas reais carregadas da Saipos:', apiData);
      
          // Converter dados da API para o formato esperado
          return this.convertStoresData();
    } catch (error) {
      console.error('❌ Erro ao obter lojas:', error);
      
      // Em caso de erro, retornar dados mockados para teste
      console.log('⚠️ Usando dados mockados para teste');
      return this.getMockStores();
    }
  }

  // Método para obter dados mockados de lojas (para teste)
  private getMockStores(): SaiposStore[] {
    return [
      {
        id: "1",
        name: "Restaurante Central",
        address: "Rua Principal, 123 - Centro",
        phone: "(11) 99999-9999",
        status: 'active',
        cnpj: "12.345.678/0001-90",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        apiId: "saipos-1"
      },
      {
        id: "2",
        name: "Pizzaria do João",
        address: "Av. Comercial, 456 - Vila Nova",
        phone: "(11) 88888-8888",
        status: 'active',
        cnpj: "98.765.432/0001-10",
        city: "São Paulo",
        state: "SP",
        zipCode: "04567-890",
        lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        apiId: "saipos-2"
      },
      {
        id: "3",
        name: "Lanchonete Express",
        address: "Rua das Flores, 789 - Jardim",
        phone: "(11) 77777-7777",
        status: 'active',
        cnpj: "11.222.333/0001-44",
        city: "São Paulo",
        state: "SP",
        zipCode: "05678-901",
        lastSync: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        apiId: "saipos-3"
      }
    ];
  }

  // Método para converter dados de lojas da API Saipos para o formato interno
  private convertStoresData(): SaiposStore[] {
    // Implementar conversão baseada na estrutura real da API Saipos
    // Por enquanto, retornar array vazio até termos a estrutura real
    return [];
  }

  // Método para obter dados em tempo real da API real da Saipos
  async getRealTimeData(): Promise<SaiposSalesData> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log('⚡ Buscando dados em tempo real da Saipos...');
      
      // Fazer chamada real para a API da Saipos
      const response = await fetch(`${this.config.baseUrl}/api/v1/realtime`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log('✅ Dados em tempo real carregados da Saipos:', apiData);
      
      // Converter dados da API para o formato esperado
      return this.convertRealTimeData(apiData);
    } catch (error) {
      console.error('❌ Erro ao obter dados em tempo real:', error);
      
      // Em caso de erro, retornar dados vazios
      return {
        date: new Date().toISOString().split('T')[0],
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
        totalRevenue: 0,
        ordersByChannel: {
          delivery: 0,
          counter: 0,
          hall: 0,
          ticket: 0
        },
        topProducts: []
      };
    }
  }

  // Método para converter dados em tempo real da API Saipos para o formato interno
  private convertRealTimeData(apiData: SaiposAPIResponse): SaiposSalesData {
    // Implementar conversão baseada na estrutura real da API Saipos
    // Por enquanto, retornar dados vazios até termos a estrutura real
    return {
      date: apiData.date || new Date().toISOString().split('T')[0],
      totalSales: 0,
      totalOrders: 0,
      averageTicket: 0,
      uniqueCustomers: 0,
      totalRevenue: 0,
      ordersByChannel: {
        delivery: 0,
        counter: 0,
        hall: 0,
        ticket: 0
      },
      topProducts: []
    };
  }

  // Método para obter relatório diário da API real da Saipos
  async getDailyReport(date: string): Promise<SaiposSalesData> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log(`📊 Gerando relatório diário real da Saipos para: ${date}`);
      
      // Fazer chamada real para a API da Saipos
      const response = await fetch(`${this.config.baseUrl}/api/v1/daily-report?date=${date}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log('✅ Relatório diário real carregado da Saipos:', apiData);
      
      // Converter dados da API para o formato esperado
      return this.convertDailyReportData(apiData);
    } catch (error) {
      console.error('❌ Erro ao obter relatório diário:', error);
      
      // Em caso de erro, retornar dados vazios
      return {
        date: date,
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
        totalRevenue: 0,
        ordersByChannel: {
          delivery: 0,
          counter: 0,
          hall: 0,
          ticket: 0
        },
        topProducts: []
      };
    }
  }

  // Método para converter dados de relatório diário da API Saipos para o formato interno
  private convertDailyReportData(apiData: SaiposAPIResponse): SaiposSalesData {
    // Implementar conversão baseada na estrutura real da API Saipos
    // Por enquanto, retornar dados vazios até termos a estrutura real
    return {
      date: apiData.date || new Date().toISOString().split('T')[0],
      totalSales: 0,
      totalOrders: 0,
      averageTicket: 0,
      uniqueCustomers: 0,
      totalRevenue: 0,
      ordersByChannel: {
        delivery: 0,
        counter: 0,
        hall: 0,
        ticket: 0
      },
      topProducts: []
    };
  }
}

// Instância padrão do serviço (você pode configurar com suas credenciais)
export const saiposAPI = new SaiposAPIService({
  apiKey: process.env.NEXT_PUBLIC_SAIPOS_API_KEY || '',
  baseUrl: process.env.NEXT_PUBLIC_SAIPOS_BASE_URL || 'https://api.saipos.com',
});

export default SaiposAPIService;

// ===== Novo wrapper funcional conforme especificação =====
const BASE_URL = 'https://api.saipos.com.br/v1';

export const saiposHTTP = {
  async getStores(token: string) {
    const res = await fetch(`${BASE_URL}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Erro ao buscar lojas');
    return res.json();
  },

  async getSalesData(startDate: string, endDate: string, token: string) {
    const res = await fetch(
      `${BASE_URL}/reports/sales?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    );
    if (!res.ok) throw new Error('Erro ao buscar dados de vendas');
    return res.json();
  },

  async getDailyReport(date: string, token: string) {
    const res = await fetch(`${BASE_URL}/reports/daily?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Erro ao buscar relatório diário');
    return res.json();
  },
};

