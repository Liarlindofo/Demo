export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeSalesResponse } from "@/lib/saipos-api";
import { Prisma } from "@prisma/client";

interface SyncRequest {
  apiId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  initialLoad?: boolean; // Flag para carregamento inicial de 90 dias
}

// Função helper para fazer delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função helper para fazer requisição com retry
const fetchWithRetry = async (
  url: string,
  token: string,
  retries = 3
): Promise<Response> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter
        ? parseInt(retryAfter) * 1000
        : attempt * 2000;
      console.warn(
        `⚠️ Rate limit (429) - tentativa ${attempt}/${retries}. Aguardando ${waitTime}ms...`
      );
      await sleep(waitTime);
      continue;
    }

    return response;
  }
  throw new Error(`Rate limit após ${retries} tentativas`);
};

// Função para buscar vendas da API Saipos com paginação
async function fetchSalesFromSaipos(
  token: string,
  startDate: string,
  endDate: string
): Promise<unknown[]> {
  const allSales: unknown[] = [];
  let offset = 0;
  const limit = 200;
  let hasMoreData = true;
  let consecutiveEmptyPages = 0;
  const maxConsecutiveEmpty = 20;
  let totalRequests = 0;
  const maxTotalRequests = 100;
  const delayBetweenRequests = 800;

  while (hasMoreData) {
    const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(
      startDate
    )}&p_filter_date_end=${encodeURIComponent(
      endDate
    )}&p_limit=${limit}&p_offset=${offset}`;

    totalRequests++;
    console.log(
      `📥 Sincronizando vendas: offset=${offset}, limit=${limit} (requisição ${totalRequests}/${maxTotalRequests})`
    );

    let response: Response;
    try {
      response = await fetchWithRetry(apiUrl, token);
    } catch (error) {
      console.error("Erro ao fazer requisição:", error);
      break;
    }

    if (!response.ok && response.status !== 429) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      console.error("Erro na API Saipos:", response.status, errorText);
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

    const pageArray = Array.isArray(pageData)
      ? pageData
      : Array.isArray((pageData as Record<string, unknown>)?.data)
      ? (pageData as { data: unknown[] }).data
      : Array.isArray((pageData as Record<string, unknown>)?.items)
      ? (pageData as { items: unknown[] }).items
      : [];

    if (pageArray.length === 0 || pageData === null) {
      consecutiveEmptyPages++;
      if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
        hasMoreData = false;
        break;
      }
      offset += limit;
      await sleep(delayBetweenRequests);
      continue;
    }

    consecutiveEmptyPages = 0;
    allSales.push(...pageArray);
    console.log(
      `✅ Página carregada: ${pageArray.length} venda(s) (total: ${allSales.length})`
    );

    offset += limit;

    if (totalRequests >= maxTotalRequests) {
      console.warn(
        `⚠️ Limite de requisições atingido (${totalRequests}). Parando paginação.`
      );
      hasMoreData = false;
      break;
    }

    if (hasMoreData) {
      await sleep(delayBetweenRequests);
    }
  }

  return allSales;
}

// POST /api/saipos/sync - Sincronizar dados de uma loja específica
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SyncRequest;
    const { apiId, storeId, startDate, endDate, initialLoad } = body;

    if (!apiId) {
      console.error("❌ apiId não fornecido");
      return NextResponse.json(
        { success: false, error: "apiId é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar API do banco
    const saiposAPI = await db.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      console.error("❌ API Saipos não encontrada:", apiId);
      return NextResponse.json(
        { success: false, error: "API Saipos não encontrada" },
        { status: 404 }
      );
    }

    const apiKey = saiposAPI.apiKey;
    const targetStoreId = storeId || saiposAPI.name;

    if (!apiKey) {
      console.error("❌ API key não encontrada");
      return NextResponse.json(
        { success: false, error: "API key não encontrada" },
        { status: 401 }
      );
    }

    if (!targetStoreId) {
      console.error("❌ Store ID não encontrado");
      return NextResponse.json(
        { success: false, error: "Store ID não encontrado" },
        { status: 400 }
      );
    }

    const cleanToken = apiKey.trim().replace(/^Bearer\s+/i, "");

    if (!cleanToken) {
      console.error("❌ Token vazio após limpeza");
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    // Determinar período de sincronização
    const today = new Date();
    const syncEndDate = endDate || today.toISOString().split("T")[0];
    const syncStartDate =
      startDate ||
      (initialLoad
        ? new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : syncEndDate); // Se não for initial load, sincronizar apenas o dia atual

    console.log(
      `🔄 Iniciando sincronização para storeId=${targetStoreId}, período: ${syncStartDate} a ${syncEndDate}${initialLoad ? " (carregamento inicial)" : ""}`
    );

    let syncedCount = 0;

    // Se for carregamento inicial, processar dia por dia para evitar rate limiting
    if (initialLoad && syncStartDate !== syncEndDate) {
      const start = new Date(syncStartDate);
      const end = new Date(syncEndDate);
      const daysToProcess: string[] = [];

      // Gerar lista de dias
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        daysToProcess.push(d.toISOString().split("T")[0]);
      }

      console.log(
        `📅 Processando ${daysToProcess.length} dias em lotes para evitar rate limiting...`
      );

      // Processar em lotes de 7 dias por vez
      const batchSize = 7;
      for (let i = 0; i < daysToProcess.length; i += batchSize) {
        const batch = daysToProcess.slice(i, i + batchSize);
        const batchStart = batch[0];
        const batchEnd = batch[batch.length - 1];

        console.log(
          `📦 Processando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(daysToProcess.length / batchSize)}: ${batchStart} a ${batchEnd}`
        );

        try {
          const sales = await fetchSalesFromSaipos(
            cleanToken,
            batchStart,
            batchEnd
          );

          if (sales.length > 0) {
            const normalized = normalizeSalesResponse(sales);

            for (const data of normalized) {
              try {
                const date = new Date(data.date);
                const channels = data.salesByOrigin
                  ? {
                      salesByOrigin: data.salesByOrigin,
                      ordersByChannel: data.ordersByChannel,
                    }
                  : null;

                await db.salesDaily.upsert({
                  where: {
                    storeId_date: {
                      storeId: targetStoreId,
                      date: date,
                    },
                  },
                  create: {
                    storeId: targetStoreId,
                    date: date,
                    totalOrders: data.totalOrders,
                    totalSales: new Prisma.Decimal(data.totalSales),
                    averageTicket: data.averageTicket
                      ? new Prisma.Decimal(data.averageTicket)
                      : null,
                    uniqueCustomers: data.uniqueCustomers || null,
                    channels: channels as Prisma.JsonValue,
                  },
                  update: {
                    totalOrders: data.totalOrders,
                    totalSales: new Prisma.Decimal(data.totalSales),
                    averageTicket: data.averageTicket
                      ? new Prisma.Decimal(data.averageTicket)
                      : null,
                    uniqueCustomers: data.uniqueCustomers || null,
                    channels: channels as Prisma.JsonValue,
                    updatedAt: new Date(),
                  },
                });

                syncedCount++;
              } catch (error) {
                console.error(`Erro ao salvar dados para ${data.date}:`, error);
              }
            }
          }

          // Aguardar entre lotes para evitar rate limiting
          if (i + batchSize < daysToProcess.length) {
            await sleep(2000); // 2 segundos entre lotes
          }
        } catch (error) {
          console.error(`Erro ao processar lote ${batchStart}-${batchEnd}:`, error);
          // Continuar com próximo lote
        }
      }
    } else {
      // Processamento normal (não é carregamento inicial ou período pequeno)
      const sales = await fetchSalesFromSaipos(
        cleanToken,
        syncStartDate,
        syncEndDate
      );

      if (sales.length === 0) {
        console.log("⚠️ Nenhuma venda encontrada no período");
        return NextResponse.json({
          success: true,
          message: "Nenhuma venda encontrada",
          synced: 0,
        });
      }

      // Normalizar dados
      const normalized = normalizeSalesResponse(sales);

      if (normalized.length === 0) {
        console.log("⚠️ Nenhuma venda normalizada");
        return NextResponse.json({
          success: true,
          message: "Nenhuma venda normalizada",
          synced: 0,
        });
      }

      // Fazer UPSERT em sales_daily
      for (const data of normalized) {
        try {
          const date = new Date(data.date);
          const channels = data.salesByOrigin
            ? {
                salesByOrigin: data.salesByOrigin,
                ordersByChannel: data.ordersByChannel,
              }
            : null;

          await db.salesDaily.upsert({
            where: {
              storeId_date: {
                storeId: targetStoreId,
                date: date,
              },
            },
            create: {
              storeId: targetStoreId,
              date: date,
              totalOrders: data.totalOrders,
              totalSales: new Prisma.Decimal(data.totalSales),
              averageTicket: data.averageTicket
                ? new Prisma.Decimal(data.averageTicket)
                : null,
              uniqueCustomers: data.uniqueCustomers || null,
              channels: channels as Prisma.JsonValue,
            },
            update: {
              totalOrders: data.totalOrders,
              totalSales: new Prisma.Decimal(data.totalSales),
              averageTicket: data.averageTicket
                ? new Prisma.Decimal(data.averageTicket)
                : null,
              uniqueCustomers: data.uniqueCustomers || null,
              channels: channels as Prisma.JsonValue,
              updatedAt: new Date(),
            },
          });

          syncedCount++;
        } catch (error) {
          console.error(`Erro ao salvar dados para ${data.date}:`, error);
          // Continuar mesmo com erro - não quebrar a sincronização
        }
      }
    }

    console.log(
      `✅ Sincronização concluída: ${syncedCount} registros salvos/atualizados`
    );

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída",
      synced: syncedCount,
      period: { start: syncStartDate, end: syncEndDate },
    });
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    // Nunca retornar erro - apenas logar
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}

