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
  // Breakdown por canal/origem (iFood, Telefone, Delivery Direto, etc.)
  salesByOrigin?: Array<{
    origin: string;
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

      const baseUrl = this.config.baseUrl || 'https://data.saipos.io/v1';
      const token = this.config.apiKey.trim();
      
      // Remover "Bearer " se o usuário colou com o prefixo
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      
      console.log('🔗 Testando conexão real com Saipos...');
      console.log(`📍 URL: ${baseUrl}/search_sales`);
      
      // Usar o endpoint /search_sales para testar a conexão
      // Criar data de hoje para o teste
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];
      
      let response: Response;
      try {
        // Adicionar timeout manual para evitar travamentos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
        
        // Usar parâmetros mínimos para testar a conexão
        const testUrl = `${baseUrl}/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${todayISO}T00:00:00&p_filter_date_end=${todayISO}T23:59:59&p_limit=1&p_offset=0`;
        
        response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'accept': 'application/json',
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
        const errorCause = fetchError instanceof Error && 'cause' in fetchError ? String(fetchError.cause) : '';
        
        console.error('❌ Erro de rede ao conectar com Saipos:', {
          message: networkError,
          name: errorName,
          cause: errorCause,
          url: `${baseUrl}/search_sales`
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
      
      const token = this.config.apiKey.trim().replace(/^Bearer\s+/i, '');
      
      // Converter datas para formato ISO com hora
      const startDateTime = `${startDate}T00:00:00`;
      const endDateTime = `${endDate}T23:59:59`;
      
      // Usar o endpoint search_sales com parâmetros corretos
      const url = `${this.config.baseUrl}/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(startDateTime)}&p_filter_date_end=${encodeURIComponent(endDateTime)}&p_limit=300&p_offset=0`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      console.log('✅ Dados reais carregados da Saipos:', apiData);

      // Converter dados da API para o formato esperado
      const dataArray = Array.isArray(apiData)
        ? (apiData as unknown[])
        : (Array.isArray((apiData as Record<string, unknown>)?.data) ? ((apiData as Record<string, unknown>).data as unknown[]) : []);
      const normalized = normalizeSalesResponse(dataArray as SaiposRawSale[]);
      // Converter NormalizedSalesData para SaiposSalesData
      return normalized.map(n => ({
        date: n.date,
        totalSales: n.totalSales,
        totalOrders: n.totalOrders,
        averageTicket: n.totalOrders > 0 ? n.totalSales / n.totalOrders : 0,
        uniqueCustomers: 0, // Não disponível nos dados normalizados
        totalRevenue: n.totalSales,
        ordersByChannel: {
          delivery: n.qtdDelivery,
          counter: n.qtdBalcao,
          hall: 0,
          ticket: 0,
        },
        topProducts: [],
        salesByOrigin: [],
      }));
    } catch (error) {
      console.error('❌ Erro ao obter dados de vendas:', error);
      throw error; // Propagar erro em vez de retornar mock
    }
  }

  // Métodos mockados REMOVIDOS - todos os dados devem ser reais
  // Não usar dados mockados em nenhuma circunstância
  // Todos os dados devem vir da API Saipos ou do banco de dados

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
      
      // SEMPRE lançar erro - nunca retornar dados mockados
      // Todos os dados devem ser reais, vindos da API ou do banco de dados
      throw error;
    }
  }

  // Método mockado REMOVIDO - todos os dados devem ser reais
  // Não usar dados mockados em nenhuma circunstância
  // Todos os dados devem vir da API Saipos ou do banco de dados

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
      
      const token = this.config.apiKey.trim().replace(/^Bearer\s+/i, '');
      
      // Converter data para formato ISO com hora
      const startDateTime = `${date}T00:00:00`;
      const endDateTime = `${date}T23:59:59`;
      
      // Usar o endpoint search_sales com filtro de data específica
      const url = `${this.config.baseUrl}/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(startDateTime)}&p_filter_date_end=${encodeURIComponent(endDateTime)}&p_limit=300&p_offset=0`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
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
  baseUrl: process.env.NEXT_PUBLIC_SAIPOS_BASE_URL || 'https://data.saipos.io/v1',
});

export default SaiposAPIService;

// ===== Novo wrapper funcional conforme especificação =====

export const saiposHTTP = {
  async getStores() {
    // Nota: endpoint de lojas pode não existir na API de dados
    // Retornar array vazio se não houver endpoint específico
    return [];
  },

  async getSalesData(startDate: string, endDate: string, _token: string, apiId?: string) {
    // Usar rota API do Next.js como proxy para evitar CORS
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    if (apiId) {
      params.append('apiId', apiId);
    }
    
    const res = await fetch(`/api/saipos/sales?${params.toString()}`, {
      headers: { 
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao buscar dados de vendas');
    }
    return res.json();
  },

  async getDailyReport(date: string, _token: string, apiId?: string) {
    // Usar rota API do Next.js como proxy para evitar CORS
    const params = new URLSearchParams({
      date,
    });
    if (apiId) {
      params.append('apiId', apiId);
    }
    
    const res = await fetch(`/api/saipos/daily?${params.toString()}`, {
      headers: { 
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao buscar relatório diário');
    }
    return res.json();
  },
};

// ===== Normalizadores para respostas desconhecidas da API =====
type JsonObject = Record<string, unknown>;

// Função para calcular a data comercial baseada no horário de operação
// A loja funciona das 17:00 até 23:30
// Se a venda aconteceu antes das 17h, ela pertence ao dia anterior
function getBusinessDate(date: Date): string {
  const START_HOUR = 17; // 17:00
  const d = new Date(date);
  const hour = d.getHours();

  // Se a venda aconteceu antes das 17h, ela pertence ao dia anterior
  if (hour < START_HOUR) {
    d.setDate(d.getDate() - 1);
  }

  // Retorna YYYY-MM-DD
  return d.toISOString().split("T")[0];
}

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

// Helper para pegar valor total da venda (suporta ambos os nomes de campo)
function getTotalSaleValue(sale: JsonObject): number {
  // A API pode retornar total_amount OU total_sale_value
  return toNumberVal(sale.total_amount || sale.total_sale_value);
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

// Tipo para dados brutos de venda da API Saipos
export interface SaiposRawSale {
  shift_date?: string;
  sale_date?: string;
  created_at?: string;
  status?: string;
  total_value?: number;
  amount_total?: number;
  order_type?: string;
  origin_name?: string;
  channel?: string;
  total_items?: number;
  additional_value?: number;
  discount_value?: number;
  delivery_fee?: number;
  [key: string]: unknown; // Permitir campos adicionais da API
}

// Tipo para dados normalizados de vendas
export interface NormalizedSalesData {
  date: string;
  totalOrders: number;
  canceledOrders: number;
  totalSales: number;
  qtdDelivery: number;
  qtdBalcao: number;
  qtdIFood: number;
  qtdTelefone: number;
  qtdCentralPedidos: number;
  qtdDeliveryDireto: number;
  totalItems: number;
  totalDeliveryFee: number;
  totalAdditions: number;
  totalDiscounts: number;
  totalSalesDelivery: number;
  totalSalesBalcao: number;
  averageTicketDelivery: number;
  averageTicketBalcao: number;
}

export function normalizeSalesResponse(sales: SaiposRawSale[]): NormalizedSalesData[] {
  const grouped: Record<string, Omit<NormalizedSalesData, 'averageTicketDelivery' | 'averageTicketBalcao'>> = {};

  for (const sale of sales) {
    const saleDate = sale.shift_date ?? sale.sale_date ?? sale.created_at ?? new Date().toISOString();
    const dateKey = new Date(saleDate).toISOString().split("T")[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        totalOrders: 0,
        canceledOrders: 0,
        totalSales: 0,
        qtdDelivery: 0,
        qtdBalcao: 0,
        qtdIFood: 0,
        qtdTelefone: 0,
        qtdCentralPedidos: 0,
        qtdDeliveryDireto: 0,
        totalItems: 0,
        totalDeliveryFee: 0,
        totalAdditions: 0,
        totalDiscounts: 0,
        totalSalesDelivery: 0,
        totalSalesBalcao: 0,
      };
    }

    const g = grouped[dateKey];
    g.totalOrders++;

    // Cancelados
    if (sale.status?.toLowerCase().includes("cancel")) g.canceledOrders++;

    // Valores
    const value = Number(sale.total_value ?? sale.amount_total ?? 0);
    g.totalSales += value;

    // Tipo de pedido
    const type = sale.order_type?.toLowerCase() ?? "";
    if (type.includes("delivery")) {
      g.qtdDelivery++;
      g.totalSalesDelivery += value;
      g.totalDeliveryFee += Number(sale.delivery_fee ?? 0);
    } else {
      g.qtdBalcao++;
      g.totalSalesBalcao += value;
    }

    // Canais
    const channel = (sale.origin_name ?? sale.channel ?? "").toLowerCase();
    if (channel.includes("ifood")) g.qtdIFood++;
    else if (channel.includes("telefone")) g.qtdTelefone++;
    else if (channel.includes("central")) g.qtdCentralPedidos++;
    else if (channel.includes("delivery direto")) g.qtdDeliveryDireto++;

    // Itens e adicionais
    g.totalItems += Number(sale.total_items ?? 0);
    g.totalAdditions += Number(sale.additional_value ?? 0);
    g.totalDiscounts += Number(sale.discount_value ?? 0);
  }

  return Object.values(grouped).map((g) => ({
    ...g,
    averageTicketDelivery: g.qtdDelivery > 0 ? g.totalSalesDelivery / g.qtdDelivery : 0,
    averageTicketBalcao: g.qtdBalcao > 0 ? g.totalSalesBalcao / g.qtdBalcao : 0,
  }));
}

export function normalizeDailyResponse(apiJson: unknown): SaiposSalesData {
  try {
    // Verificar se é null ou undefined
    if (apiJson === null || apiJson === undefined) {
      const today = new Date().toISOString().split('T')[0];
      return {
        date: today,
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
        totalRevenue: 0,
        ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
        topProducts: [],
        salesByOrigin: [],
      };
    }
    
    // Se a API retornou array diretamente
    let salesArray: JsonObject[] = [];
    if (Array.isArray(apiJson)) {
      salesArray = apiJson as JsonObject[];
    } else if (apiJson && typeof apiJson === 'object') {
      // Se retornou no formato { data: [...] }
      const root = apiJson as JsonObject;
      const candidate = getProp(root, 'data') ?? getProp(root, 'results') ?? getProp(root, 'sales') ?? getProp(root, 'items');
      if (Array.isArray(candidate)) {
        salesArray = candidate;
      } else {
        // Se nenhum dos formatos reconhecidos, retornar array vazio no objeto padrão
        const today = new Date().toISOString().split('T')[0];
        return {
          date: today,
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          uniqueCustomers: 0,
          totalRevenue: 0,
          ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
          topProducts: [],
          salesByOrigin: [],
        };
      }
    } else {
      // Se nenhum dos formatos reconhecidos, retornar array vazio no objeto padrão
      const today = new Date().toISOString().split('T')[0];
      return {
        date: today,
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
        totalRevenue: 0,
        ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
        topProducts: [],
        salesByOrigin: [],
      };
    }

    if (salesArray.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return {
        date: today,
        totalSales: 0,
        totalOrders: 0,
        averageTicket: 0,
        uniqueCustomers: 0,
        totalRevenue: 0,
        ordersByChannel: { delivery: 0, counter: 0, hall: 0, ticket: 0 },
        topProducts: [],
        salesByOrigin: [],
      };
    }

    // Agrupar vendas por data comercial antes de processar
    // Isso garante que vendas após meia-noite até 17h sejam agrupadas no dia anterior
    const salesByBusinessDate = new Map<string, JsonObject[]>();
    
    salesArray.forEach((sale: JsonObject) => {
      const shiftDate = toStringVal(sale.shift_date ?? sale.created_at ?? sale.date ?? sale.sale_date ?? new Date().toISOString());
      const saleDateObj = new Date(shiftDate);
      const businessDate = getBusinessDate(saleDateObj);
      
      if (!salesByBusinessDate.has(businessDate)) {
        salesByBusinessDate.set(businessDate, []);
      }
      salesByBusinessDate.get(businessDate)!.push(sale);
    });
    
    // Processar todas as vendas agrupadas (normalmente será um único dia, mas pode ter vendas do dia anterior)
    // Pegar a data comercial mais recente (ou a primeira se houver apenas uma)
    const businessDates = Array.from(salesByBusinessDate.keys()).sort();
    const dateOnly = businessDates.length > 0 ? businessDates[businessDates.length - 1] : new Date().toISOString().split('T')[0];
    
    // Usar todas as vendas do dia comercial mais recente (ou todas se houver apenas um dia)
    const salesToProcess = businessDates.length === 1 
      ? salesByBusinessDate.get(dateOnly) || []
      : salesByBusinessDate.get(dateOnly) || [];
    
    const firstSale = salesToProcess.length > 0 ? salesToProcess[0] as JsonObject : salesArray[0] as JsonObject;

    console.log('🔍 DEBUG - Primeira venda:', JSON.stringify(firstSale).substring(0, 500));
    console.log('🔍 DEBUG - Campos disponíveis na venda:', Object.keys(firstSale));
    console.log('🔍 DEBUG - total_amount:', firstSale.total_amount);
    console.log('🔍 DEBUG - total_sale_value:', firstSale.total_sale_value);
    console.log('🔍 DEBUG - id_sale_type:', firstSale.id_sale_type);
    
    // Verificar estrutura de partner_sale (canal/origem)
    const partnerSale = getProp(firstSale, 'partner_sale');
    console.log('🔍 DEBUG - partner_sale:', partnerSale);
    const origin = getProp(firstSale, 'origin');
    console.log('🔍 DEBUG - origin:', origin);
    const desc_sale = getProp(firstSale, 'desc_sale');
    console.log('🔍 DEBUG - desc_sale:', desc_sale);

    // Calcular totais por tipo de venda (id_sale_type)
    // 1=Delivery, 2=Retirada, 3=Salão, 4=Ficha
    const deliverySales = salesToProcess.filter(s => toNumberVal(s.id_sale_type) === 1);
    const counterSales = salesToProcess.filter(s => toNumberVal(s.id_sale_type) === 2);
    const hallSales = salesToProcess.filter(s => toNumberVal(s.id_sale_type) === 3);
    const ticketSales = salesToProcess.filter(s => toNumberVal(s.id_sale_type) === 4);

    // Calcular valores totais usando total_amount ou total_sale_value (já inclui descontos e acréscimos)
    const totalRevenue = salesToProcess.reduce((sum, s) => sum + getTotalSaleValue(s), 0);
    const totalOrders = salesToProcess.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    console.log('🔍 DEBUG - Total calculado:', totalRevenue);
    console.log('🔍 DEBUG - Pedidos:', totalOrders);
    console.log('🔍 DEBUG - Ticket médio:', averageTicket);

    // Extrair clientes únicos (contar apenas id_customer únicos)
    const customerIds = new Set<string>();
    salesToProcess.forEach(s => {
      const customer = getProp(s, 'customer');
      if (customer && typeof customer === 'object') {
        const customerId = toStringVal((customer as JsonObject).id_customer);
        if (customerId) {
          customerIds.add(customerId);
        }
      }
    });
    const uniqueCustomers = customerIds.size;

    console.log('🔍 DEBUG - Clientes únicos:', uniqueCustomers);

    // Extrair produtos mais vendidos dos itens (incluindo complementos)
    const productMap = new Map<string, { quantity: number; revenue: number; name: string }>();
    
    salesToProcess.forEach((sale: JsonObject) => {
      const items = asArray(getProp(sale, 'items'));
      items.forEach((item: JsonObject) => {
        // Ignorar itens deletados
        if (item.deleted === true) return;
        
        const itemName = toStringVal(item.desc_sale_item || item.desc_store_item || 'Item sem nome');
        const quantity = toNumberVal(item.quantity);
        const unitPrice = toNumberVal(item.unit_price);
        
        // Adicionar preço de complementos (choices)
        let additionalPrice = 0;
        const choices = asArray(getProp(item, 'choices'));
        choices.forEach((choice: JsonObject) => {
          additionalPrice += toNumberVal(choice.aditional_price);
        });
        
        const itemTotal = (unitPrice + additionalPrice) * quantity;

        if (productMap.has(itemName)) {
          const existing = productMap.get(itemName)!;
          existing.quantity += quantity;
          existing.revenue += itemTotal;
        } else {
          productMap.set(itemName, { quantity, revenue: itemTotal, name: itemName });
        }
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ name: p.name, quantity: p.quantity, revenue: p.revenue }));

    console.log('🔍 DEBUG - Top produtos:', topProducts.slice(0, 3));

    // Calcular breakdown por canal/origem
    const originMap = new Map<string, { quantity: number; revenue: number }>();
    
    salesToProcess.forEach((sale: JsonObject) => {
      // Tentar diferentes campos para identificar o canal
      let originName = 'Sem origem';
      
      // Verificar partner_sale (marketplace)
      const partnerSale = getProp(sale, 'partner_sale');
      if (partnerSale && typeof partnerSale === 'object') {
        const partnerObj = partnerSale as JsonObject;
        const partnerName = toStringVal(partnerObj.desc_store_partner || partnerObj.name || partnerObj.partner);
        if (partnerName && partnerName !== 'null' && partnerName !== '') {
          originName = partnerName;
        }
      }
      
      // Se não encontrou em partner_sale, verificar desc_sale
      if (originName === 'Sem origem') {
        const descSale = toStringVal(getProp(sale, 'desc_sale'));
        if (descSale && descSale !== 'null' && descSale !== '') {
          originName = descSale;
        }
      }
      
      // Se ainda não encontrou, verificar campo origin
      if (originName === 'Sem origem') {
        const origin = toStringVal(getProp(sale, 'origin'));
        if (origin && origin !== 'null' && origin !== '') {
          originName = origin;
        }
      }
      
      // Normalizar nomes comuns
      originName = originName.toLowerCase();
      if (originName.includes('ifood')) originName = 'iFood';
      else if (originName.includes('telefone') || originName.includes('phone')) originName = 'Telefone';
      else if (originName.includes('delivery direto') || originName.includes('direto')) originName = 'Delivery Direto';
      else if (originName.includes('central')) originName = 'Central de Pedidos';
      else if (originName.includes('whatsapp') || originName.includes('wa')) originName = 'WhatsApp';
      else if (originName.includes('facebook')) originName = 'Facebook';
      else if (originName.includes('anota')) originName = 'Anota.ai';
      else originName = originName.charAt(0).toUpperCase() + originName.slice(1);
      
      const saleValue = getTotalSaleValue(sale);
      
      if (originMap.has(originName)) {
        const existing = originMap.get(originName)!;
        existing.quantity += 1;
        existing.revenue += saleValue;
      } else {
        originMap.set(originName, { quantity: 1, revenue: saleValue });
      }
    });

    const salesByOrigin = Array.from(originMap.entries())
      .map(([origin, data]) => ({
        origin,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    console.log('🔍 DEBUG - Vendas por canal/origem:', salesByOrigin);
    console.log('🔍 DEBUG - Total de vendas processadas:', salesToProcess.length);

    const result = {
      date: dateOnly,
      totalSales: totalRevenue,
      totalOrders: totalOrders,
      averageTicket: averageTicket,
      uniqueCustomers: uniqueCustomers,
      totalRevenue: totalRevenue,
      deliverySales: deliverySales.reduce((sum, s) => sum + getTotalSaleValue(s), 0),
      counterSales: counterSales.reduce((sum, s) => sum + getTotalSaleValue(s), 0),
      hallSales: hallSales.reduce((sum, s) => sum + getTotalSaleValue(s), 0),
      ticketSales: ticketSales.reduce((sum, s) => sum + getTotalSaleValue(s), 0),
      ordersByChannel: {
        delivery: deliverySales.length,
        counter: counterSales.length,
        hall: hallSales.length,
        ticket: ticketSales.length,
      },
      topProducts: topProducts,
      salesByOrigin: salesByOrigin,
    };

    console.log('✅ DEBUG - Resultado final:', result);

    return result;
  } catch (error) {
    console.error('Erro ao normalizar resposta diária:', error);
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
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

