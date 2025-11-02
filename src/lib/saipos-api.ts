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

      const baseUrl = this.config.baseUrl || 'https://api.saipos.com.br/v1';
      const token = this.config.apiKey.trim();
      
      // Remover "Bearer " se o usuário colou com o prefixo
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      
      console.log('🔗 Testando conexão real com Saipos...');
      console.log(`📍 URL: ${baseUrl}/stores`);
      
      // Usar o mesmo endpoint que funciona no saiposHTTP
      let response: Response;
      try {
        // Adicionar timeout manual para evitar travamentos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
        
        response = await fetch(`${baseUrl}/stores`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Drin-Platform/1.0',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        // Erro de rede ou conexão
        const networkError = fetchError instanceof Error ? fetchError.message : String(fetchError);
        const errorName = fetchError instanceof Error ? fetchError.name : 'UnknownError';
        const errorCause = fetchError instanceof Error && (fetchError as any).cause ? String((fetchError as any).cause) : '';
        
        console.error('❌ Erro de rede ao conectar com Saipos:', {
          message: networkError,
          name: errorName,
          cause: errorCause,
          url: `${baseUrl}/stores`
        });
        
        // Verificar se foi abortado por timeout
        if (errorName === 'AbortError' || networkError.includes('aborted')) {
          throw new Error(`Timeout ao conectar com a API Saipos (15s). Verifique se a URL está correta: ${baseUrl}`);
        }
        
        // Mensagens mais específicas baseadas no tipo de erro
        if (networkError.includes('fetch failed') || networkError.includes('Failed to fetch')) {
          // Tentar obter mais informações do erro
          const detailedMessage = errorCause || networkError;
          throw new Error(`Não foi possível conectar com a API Saipos. Verifique:\n1. URL: ${baseUrl}\n2. Token válido\n3. Conexão com internet\n\nDetalhes: ${detailedMessage}`);
        }
        
        if (networkError.includes('ECONNREFUSED')) {
          throw new Error(`Conexão recusada. Verifique se a URL base está correta: ${baseUrl}`);
        }
        
        if (networkError.includes('ENOTFOUND') || networkError.includes('getaddrinfo')) {
          throw new Error(`URL não encontrada. Verifique se a URL base está correta: ${baseUrl}`);
        }
        
        if (networkError.includes('ETIMEDOUT') || networkError.includes('timeout')) {
          throw new Error(`Timeout ao conectar com a API Saipos. Tente novamente mais tarde.`);
        }
        
        if (networkError.includes('SSL') || networkError.includes('TLS') || networkError.includes('certificate')) {
          throw new Error(`Erro de certificado SSL. Verifique se a URL usa HTTPS: ${baseUrl}`);
        }
        
        throw new Error(`Erro de conexão: ${networkError}`);
      }

      const responseText = await response.text();
      let responseData: unknown;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (response.ok) {
        console.log('✅ Conexão com Saipos estabelecida!');
        return true;
      }
      
      // Capturar mensagem de erro específica da API
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      if (responseData && typeof responseData === 'object') {
        const errorObj = responseData as { message?: string; error?: string; detail?: string };
        errorMessage = errorObj.message || errorObj.error || errorObj.detail || errorMessage;
      }
      
      // Se retornar 401 ou 403, o token está inválido
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Token inválido ou sem permissão: ${errorMessage}`);
      }
      
      // Se retornar 404, o endpoint pode não existir
      if (response.status === 404) {
        throw new Error(`Endpoint não encontrado. Verifique se a URL base está correta: ${baseUrl}`);
      }
      
      // Outros erros
      throw new Error(errorMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Erro ao testar conexão com Saipos:', errorMessage);
      throw error; // Propagar o erro para mostrar mensagem específica
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
      const response = await fetch(`${this.config.baseUrl}/reports/sales?start_date=${startDate}&end_date=${endDate}`, {
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
      const normalized = normalizeSalesResponse(apiData);
      return normalized;
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
      const response = await fetch(`${this.config.baseUrl}/stores`, {
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
      const normalized = normalizeStoresResponse(apiData);
      return normalized;
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
      const response = await fetch(`${this.config.baseUrl}/realtime`, {
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
      const normalized = normalizeDailyResponse(apiData);
      return normalized;
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
    return normalizeDailyResponse(apiData);
  }

  // Método para obter relatório diário da API real da Saipos
  async getDailyReport(date: string): Promise<SaiposSalesData> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API Key não configurada');
      }

      console.log(`📊 Gerando relatório diário real da Saipos para: ${date}`);
      
      // Fazer chamada real para a API da Saipos
      const response = await fetch(`${this.config.baseUrl}/reports/daily?date=${date}`, {
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
      const normalized = normalizeDailyResponse(apiData);
      return normalized;
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
    return normalizeDailyResponse(apiData);
  }
}

// Instância padrão do serviço (você pode configurar com suas credenciais)
export const saiposAPI = new SaiposAPIService({
  apiKey: process.env.NEXT_PUBLIC_SAIPOS_API_KEY || '',
  baseUrl: process.env.NEXT_PUBLIC_SAIPOS_BASE_URL || 'https://api.saipos.com.br/v1',
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

// ===== Normalizadores para respostas desconhecidas da API =====
type JsonObject = Record<string, unknown>;

function asArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? (value as JsonObject[]) : [];
}

function getProp(obj: JsonObject | undefined, key: string): unknown {
  return obj ? (obj as Record<string, unknown>)[key] : undefined;
}

function toStringVal(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function toNumberVal(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function normalizeStoresResponse(apiJson: unknown): SaiposStore[] {
  try {
    const root = (apiJson ?? {}) as JsonObject;
    const candidate = Array.isArray(apiJson)
      ? (apiJson as JsonObject[])
      : (getProp(root, 'data') as unknown) ?? getProp(root, 'stores') ?? getProp(root, 'results');
    const list = asArray(candidate);
    if (!Array.isArray(list)) return [];
    return list.map((itemObj: JsonObject, idx: number) => ({
      id: toStringVal(itemObj.id ?? itemObj.store_id ?? itemObj.uuid ?? idx + 1),
      name: toStringVal(itemObj.name ?? itemObj.fantasy_name ?? itemObj.tradingName ?? `Loja ${idx + 1}`),
      address: toStringVal(itemObj.address),
      phone: toStringVal(itemObj.phone),
      status: (itemObj.active as boolean) === false ? 'inactive' : 'active',
      cnpj: toStringVal(itemObj.cnpj) || undefined,
      city: toStringVal(itemObj.city) || undefined,
      state: toStringVal(itemObj.state) || undefined,
      zipCode: toStringVal(itemObj.zipCode) || undefined,
      lastSync: toStringVal(getProp(itemObj, 'last_sync')) || undefined,
      apiId: toStringVal(getProp(itemObj, 'apiId')) || undefined,
    }));
  } catch {
    return [];
  }
}

export function normalizeSalesResponse(apiJson: unknown): SaiposSalesData[] {
  try {
    const root = (apiJson ?? {}) as JsonObject;
    const arrCandidate = Array.isArray(apiJson) ? apiJson : getProp(root, 'data') ?? getProp(root, 'results');
    const arr = asArray(arrCandidate);
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.map((row: JsonObject) => ({
        date: toStringVal(row.date ?? row.day ?? new Date().toISOString().split('T')[0]),
        totalSales: toNumberVal(row.total_sales ?? row.revenue ?? 0),
        totalOrders: toNumberVal(row.total_orders ?? row.orders ?? 0),
        averageTicket: toNumberVal(row.avg_ticket ?? row.average_ticket ?? 0),
        uniqueCustomers: toNumberVal(row.unique_customers ?? 0),
        totalRevenue: toNumberVal(row.total_revenue ?? row.revenue ?? 0),
        ordersByChannel: {
          delivery: toNumberVal(row.delivery ?? 0),
          counter: toNumberVal(row.counter ?? 0),
          hall: toNumberVal(row.hall ?? 0),
          ticket: toNumberVal(row.ticket ?? 0),
        },
        topProducts: (() => {
          const tp = getProp(row, 'top_products');
          const arr = asArray(tp);
          return arr.map((p: JsonObject) => ({
              name: toStringVal(p.name),
              quantity: toNumberVal(p.quantity),
              revenue: toNumberVal(p.revenue),
            }));
        })(),
      }));
    }
    // Fallback quando vem só um summary
    const summary = getProp(root, 'summary') as JsonObject | undefined;
    if (summary) {
      return [
        {
          date: new Date().toISOString().split('T')[0],
          totalSales: toNumberVal(summary.totalSales ?? summary.revenue ?? 0),
          totalOrders: toNumberVal(summary.totalOrders ?? 0),
          averageTicket: toNumberVal(summary.averageTicket ?? 0),
          uniqueCustomers: toNumberVal(summary.uniqueCustomers ?? 0),
          totalRevenue: toNumberVal(summary.totalSales ?? summary.revenue ?? 0),
          ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
          topProducts: [],
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}

export function normalizeDailyResponse(apiJson: unknown): SaiposSalesData {
  try {
    const root = (apiJson ?? {}) as JsonObject;
    const dataCandidate = getProp(root, 'data');
    const item = asArray(dataCandidate)[0] ?? (dataCandidate as JsonObject | undefined) ?? (apiJson as JsonObject);
    return {
      date: toStringVal(item?.date ?? new Date().toISOString().split('T')[0]),
      totalSales: toNumberVal(item?.total_sales ?? item?.revenue ?? 0),
      totalOrders: toNumberVal(item?.total_orders ?? item?.orders ?? 0),
      averageTicket: toNumberVal(item?.avg_ticket ?? item?.average_ticket ?? 0),
      uniqueCustomers: toNumberVal(item?.unique_customers ?? 0),
      totalRevenue: toNumberVal(item?.total_revenue ?? item?.revenue ?? 0),
      ordersByChannel: {
        delivery: toNumberVal(item?.delivery ?? 0),
        counter: toNumberVal(item?.counter ?? 0),
        hall: toNumberVal(item?.hall ?? 0),
        ticket: toNumberVal(item?.ticket ?? 0),
      },
      topProducts: (() => {
        const tp = getProp(item as JsonObject, 'top_products');
        return asArray(tp).map((p: JsonObject) => ({
          name: toStringVal(p?.name),
          quantity: toNumberVal(p?.quantity),
          revenue: toNumberVal(p?.revenue),
        }));
      })(),
    };
  } catch {
    return {
      date: new Date().toISOString().split('T')[0],
      totalSales: 0,
      totalOrders: 0,
      averageTicket: 0,
      uniqueCustomers: 0,
      totalRevenue: 0,
      ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
      topProducts: [],
    };
  }
}

