export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const start = url.searchParams.get("data_inicial");
    const end = url.searchParams.get("data_final");
    const apiId = url.searchParams.get("apiId");
    const storeIdParam = url.searchParams.get("storeId"); // Fallback: aceitar storeId via query

    if (!start || !end || !apiId) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    const saiposAPI = await db.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      return NextResponse.json({ error: "API Saipos não encontrada" }, { status: 404 });
    }

    const apiKey = saiposAPI.apiKey;
    // Usar storeId do query param se fornecido, senão usar o name da API
    const storeId = storeIdParam || saiposAPI.name;

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 401 });
    }

    if (!storeId) {
      return NextResponse.json({ error: "Store ID não encontrado. Configure o storeId na API ou envie via query param." }, { status: 400 });
    }

    // Limpar e preparar o token (remover espaços e "Bearer " se já existir)
    const cleanToken = apiKey.trim().replace(/^Bearer\s+/i, '');

    if (!cleanToken) {
      return NextResponse.json({ error: "API key is empty after cleaning" }, { status: 401 });
    }

    // Logs de verificação
    console.log("=== DEBUG SAIPOS API ===");
    console.log("API ID recebido:", apiId);
    console.log("Store ID:", storeId);
    console.log("Token presente:", cleanToken ? "SIM" : "NÃO");
    console.log("Token preview:", cleanToken.substring(0, 20) + "...");

    console.log("Datas recebidas do cliente - start:", start, "end:", end);

    // Converter datas para ISO puro (remover timezone -03:00)
    const startISO = start.replace(/-03:00$/, '');
    const endISO = end.replace(/-03:00$/, '');
    
    console.log("Usando datas do período selecionado:");
    console.log("Start:", startISO);
    console.log("End:", endISO);
    console.log("Período em dias:", Math.ceil((new Date(endISO).getTime() - new Date(startISO).getTime()) / (1000 * 60 * 60 * 24)));

    // Implementar paginação para buscar TODAS as vendas
    // IMPORTANTE: Adicionar delay entre requisições para evitar rate limiting (429)
    const allSales: unknown[] = [];
    let offset = 0;
    const limit = 200; // Aumentar limit para reduzir número de requisições
    let hasMoreData = true;
    let lastUrl = '';
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmpty = 20; // Reduzir para parar mais rápido quando não encontra nada
    let totalRequests = 0;
    const maxTotalRequests = 100; // Reduzir para evitar buscas muito longas
    const delayBetweenRequests = 800; // Delay de 800ms - balance entre velocidade e rate limiting
    const maxRetries = 3; // Máximo de tentativas em caso de 429
    let lastFoundOffset = -1; // Rastrear último offset onde encontramos vendas
    let foundAnySales = false; // Flag para saber se encontramos pelo menos uma venda
    let maxOffsetSearched = 0; // Rastrear o offset máximo pesquisado

    // Função helper para fazer delay
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Função helper para fazer requisição com retry
    const fetchWithRetry = async (url: string, retries = maxRetries): Promise<Response> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanToken}`,
          },
          cache: "no-store",
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt * 2000); // Esperar 2s, 4s, 6s...
          console.warn(`⚠️ Rate limit (429) - tentativa ${attempt}/${retries}. Aguardando ${waitTime}ms...`);
          await sleep(waitTime);
          continue;
        }

        return response;
      }
      throw new Error(`Rate limit após ${retries} tentativas`);
    };

    console.log("🔄 Iniciando busca paginada de vendas...");
    console.log(`⚠️ Usando limit=${limit}, delay=${delayBetweenRequests}ms entre requisições`);

    while (hasMoreData) {
      const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(startISO)}&p_filter_date_end=${encodeURIComponent(endISO)}&p_limit=${limit}&p_offset=${offset}`;
      lastUrl = apiUrl;
      
      totalRequests++;
      console.log(`📥 Buscando vendas: offset=${offset}, limit=${limit} (requisição ${totalRequests}/${maxTotalRequests})`);

      let response: Response;
      try {
        response = await fetchWithRetry(apiUrl);
        console.log("Status da resposta:", response.status);
      } catch (error) {
        console.error("Erro ao fazer requisição:", error);
        break;
      }

      if (!response.ok && response.status !== 429) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        console.error("=== ERRO DA API SAIPOS ===");
        console.error("Status:", response.status);
        console.error("Resposta:", errorText);
        // Retornar o que já foi coletado mesmo com erro
        break;
      }

      let pageData: unknown;
      try {
        const text = await response.text();
        pageData = text ? JSON.parse(text) : null;
      } catch (parseError) {
        console.error("Erro ao fazer parse do JSON:", parseError);
        consecutiveEmptyPages++;
        offset += limit;
        continue;
      }

      // Extrair array de vendas
      const pageArray = Array.isArray(pageData)
        ? pageData
        : Array.isArray((pageData as any)?.data)
        ? (pageData as any).data
        : Array.isArray((pageData as any)?.items)
        ? (pageData as any).items
        : [];

      if (pageArray.length === 0 || pageData === null || pageData === undefined) {
        consecutiveEmptyPages++;
        maxOffsetSearched = Math.max(maxOffsetSearched, offset);
        console.log(`Página retornou 0 vendas - páginas vazias consecutivas: ${consecutiveEmptyPages}/${maxConsecutiveEmpty} (offset: ${offset})`);
        
        // Se nunca encontramos vendas e já tentamos várias páginas, parar
        // IMPORTANTE: Parar mais cedo quando não encontra nada inicialmente
        if (!foundAnySales && consecutiveEmptyPages >= 5) {
          console.log(`Nenhuma venda encontrada após ${consecutiveEmptyPages} tentativas. Parando paginação.`);
          console.log(`⚠️ A API pode não ter vendas neste período ou os offsets estão muito distantes.`);
          hasMoreData = false;
          break;
        }
        
        // Se já encontramos vendas antes, continuar buscando mas com limite mais restritivo
        if (foundAnySales && lastFoundOffset >= 0) {
          const distanceFromLastFound = offset - lastFoundOffset;
          // Se estamos muito longe (mais de 10.000 itens), parar
          // Isso evita buscar em offsets muito grandes desnecessariamente
          if (distanceFromLastFound > 10000) {
            console.log(`Fim da paginação: muito longe do último offset com vendas (${distanceFromLastFound} > 10000)`);
            console.log(`Total de vendas encontradas até agora: ${allSales.length}`);
            hasMoreData = false;
            break;
          }
        }
        
        // Parar após muitas páginas vazias consecutivas (reduzido de 100 para 20)
        if (consecutiveEmptyPages >= 20) {
          console.log(`Fim da paginação após ${consecutiveEmptyPages} páginas vazias consecutivas`);
          console.log(`Total de vendas encontradas: ${allSales.length}, Offset máximo pesquisado: ${maxOffsetSearched}`);
          hasMoreData = false;
          break;
        }
        
        // Continuar incrementando offset mesmo com páginas vazias
        offset += limit;
        
        // Aguardar antes da próxima requisição mesmo quando vazio
        await sleep(delayBetweenRequests);
        continue;
      }

      // Resetar contador de páginas vazias quando encontrar vendas
      consecutiveEmptyPages = 0;
      foundAnySales = true; // Marcar que encontramos vendas
      lastFoundOffset = offset; // Atualizar último offset onde encontramos vendas
      allSales.push(...pageArray);
      console.log(`✅ Página carregada: ${pageArray.length} venda(s) (total: ${allSales.length})`);

      // Incrementar offset para próxima página
      offset += limit;
      
      // Limite de segurança: não fazer mais de 100 requisições
      if (totalRequests >= maxTotalRequests) {
        console.warn(`⚠️ Limite de requisições atingido (${totalRequests}). Parando paginação.`);
        hasMoreData = false;
        break;
      }
      
      // Mostrar progresso a cada 100 vendas
      if (allSales.length % 100 === 0 && allSales.length > 0) {
        console.log(`📊 Progresso: ${allSales.length} vendas carregadas até agora...`);
      }
      
      // Aguardar antes da próxima requisição para evitar rate limiting
      if (hasMoreData) {
        await sleep(delayBetweenRequests);
      }
    }

    console.log(`📊 Total de vendas carregadas (antes do filtro): ${allSales.length}`);
    console.log(`📊 Offset máximo pesquisado: ${maxOffsetSearched}`);
    console.log(`📊 Total de requisições feitas: ${totalRequests}`);
    
    // Filtrar vendas pelo período solicitado no servidor antes de retornar
    // Isso garante que só retornamos vendas do período correto
    const startDateOnly = startISO.split('T')[0];
    const endDateOnly = endISO.split('T')[0];
    
    // Filtrar vendas pelo período solicitado no servidor antes de retornar
    // IMPORTANTE: Verificar qual campo de data está sendo usado
    const filteredSales = allSales.filter((sale: any) => {
      // Tentar diferentes campos de data
      const saleDate = sale.shift_date || sale.sale_date || sale.created_at || sale.date || sale.opened_at;
      
      if (!saleDate) {
        console.warn(`⚠️ Venda sem data encontrada:`, JSON.stringify(sale).substring(0, 200));
        return false;
      }
      
      const saleDateOnly = saleDate.split('T')[0];
      const isInRange = saleDateOnly >= startDateOnly && saleDateOnly <= endDateOnly;
      
      if (!isInRange && allSales.length < 50) {
        // Log apenas se tivermos poucas vendas para não poluir o console
        console.log(`📅 Venda fora do período: ${saleDateOnly} (período: ${startDateOnly} a ${endDateOnly})`);
      }
      
      return isInRange;
    });
    
    console.log(`📊 Total de vendas após filtro por data: ${filteredSales.length}`);
    console.log(`📊 Período solicitado: ${startDateOnly} a ${endDateOnly}`);
    
    if (filteredSales.length > 0) {
      console.log("Primeira venda (sample):", JSON.stringify(filteredSales[0]).substring(0, 300));
      // Verificar datas das vendas para debug
      const dates = filteredSales.map((s: any) => {
        const sale = s as any;
        const date = sale.shift_date || sale.created_at || sale.date || 'sem data';
        return date.split('T')[0];
      });
      const uniqueDates = [...new Set(dates)].sort();
      console.log(`📅 Datas únicas encontradas (${uniqueDates.length}):`, uniqueDates);
      
      // Contar vendas por data
      const salesCountByDate: Record<string, number> = {};
      filteredSales.forEach((sale: any) => {
        const date = (sale.shift_date || sale.created_at || sale.date || '').split('T')[0];
        if (date) {
          salesCountByDate[date] = (salesCountByDate[date] || 0) + 1;
        }
      });
      console.log(`📊 Vendas por data:`, salesCountByDate);
    } else {
      console.warn(`⚠️ Nenhuma venda encontrada no período ${startDateOnly} a ${endDateOnly}`);
      if (allSales.length > 0) {
        const dates = allSales.map((s: any) => {
          const sale = s as any;
          const date = sale.shift_date || sale.created_at || sale.date || 'sem data';
          return date.split('T')[0];
        });
        const uniqueDates = [...new Set(dates)].sort();
        console.log(`⚠️ Mas encontramos vendas com datas:`, uniqueDates);
      }
    }

    return NextResponse.json({ 
      data: filteredSales, // Retornar apenas vendas filtradas pelo período
      meta: { 
        status: 200,
        total: filteredSales.length,
        totalBeforeFilter: allSales.length,
        url: lastUrl,
        period: { start: startDateOnly, end: endDateOnly }
      } 
    });

  } catch (err: unknown) {
    console.error("=== ERRO INTERNO NA ROTA /api/saipos/vendas ===");
    console.error("Erro:", err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Stack:", stack);
    return NextResponse.json(
      { 
        data: [], 
        meta: { 
          status: 500, 
          error: message 
        } 
      }, 
      { status: 500 }
    );
  }
}
