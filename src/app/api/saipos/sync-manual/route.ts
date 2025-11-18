export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

interface SyncRequest {
  apiId: string;
  storeId?: string;
  days?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Busca vendas da API Saipos para um período específico
 */
async function fetchSalesFromSaipos(
  apiKey: string,
  startDate: Date,
  endDate: Date
): Promise<unknown[]> {
  const allSales: unknown[] = [];
  const limit = 200;
  let offset = 0;
  let totalRequests = 0;

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  while (true) {
    const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(
      startISO
    )}&p_filter_date_end=${encodeURIComponent(
      endISO
    )}&p_limit=${limit}&p_offset=${offset}`;

    totalRequests++;
    console.log(`📥 [Saipos] Página ${totalRequests} (offset=${offset})`);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      await res.text().catch(() => "");
      console.error("❌ Erro na API Saipos:", res.status, res.statusText);
      break;
    }

    let pageData: unknown;
    try {
      const text = await res.text();
      pageData = text ? JSON.parse(text) : null;
    } catch (err) {
      console.error("❌ Erro ao parsear JSON:", err);
      break;
    }

    const hasDataProperty = (obj: unknown): obj is { data: unknown[] } => {
      if (typeof obj !== 'object' || obj === null) return false;
      const candidate = obj as Record<string, unknown>;
      return 'data' in candidate && Array.isArray(candidate.data);
    };

    const hasItemsProperty = (obj: unknown): obj is { items: unknown[] } => {
      if (typeof obj !== 'object' || obj === null) return false;
      const candidate = obj as Record<string, unknown>;
      return 'items' in candidate && Array.isArray(candidate.items);
    };

    const pageArray = Array.isArray(pageData)
      ? pageData
      : hasDataProperty(pageData)
      ? pageData.data
      : hasItemsProperty(pageData)
      ? pageData.items
      : [];

    if (pageArray.length === 0) break;

    allSales.push(...pageArray);
    offset += limit;

    if (totalRequests >= 100) break;
    await sleep(800);
  }

  return allSales;
}

/**
 * Agrega vendas por dia
 */
function aggregateSalesByDay(sales: unknown[]): Map<string, {
  totalOrders: number;
  totalSales: number;
  channels: Record<string, number>;
}> {
  const dailyData = new Map();
  let sampleLogged = 0;

  for (const sale of sales) {
    const saleObj = sale as Record<string, unknown>;
    const saleDate = saleObj.shift_date ?? saleObj.sale_date ?? saleObj.created_at;
    if (!saleDate) continue;
    
    const dateKey = new Date(saleDate as string).toISOString().split("T")[0];
    
    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        totalOrders: 0,
        totalSales: 0,
        channels: {},
      });
    }

    const dayData = dailyData.get(dateKey)!;
    dayData.totalOrders++;
    
    // Buscar valor da venda em vários campos possíveis
    const value = Number(
      saleObj.total_value ?? 
      saleObj.amount_total ?? 
      saleObj.total ?? 
      saleObj.valor_total ?? 
      saleObj.amount ?? 
      0
    );
    dayData.totalSales += value;

    // Log de amostra para debug (primeiras 3 vendas)
    if (sampleLogged < 3) {
      console.log(`📊 Amostra venda ${sampleLogged + 1}:`, {
        date: dateKey,
        total_value: saleObj.total_value,
        amount_total: saleObj.amount_total,
        total: saleObj.total,
        valorExtraido: value,
      });
      sampleLogged++;
    }

    const channel = String(saleObj.origin_name ?? saleObj.channel ?? "outros").toLowerCase();
    dayData.channels[channel] = (dayData.channels[channel] || 0) + 1;
  }

  return dailyData;
}

export async function POST(request: Request) {
  try {
    // 1) Autenticação
    const stackUser = await stackServerApp.getUser({ or: "return-null" });
    if (!stackUser) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail || undefined,
      displayName: stackUser.displayName || undefined,
      profileImageUrl: stackUser.profileImageUrl || undefined,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    });
    const userId = dbUser.id;

    const body = (await request.json()) as SyncRequest;
    const apiId = body.apiId?.trim();
    const days = body.days && body.days > 0 ? body.days : 15;

    if (!apiId) {
      return NextResponse.json(
        { success: false, error: "apiId é obrigatório" },
        { status: 400 }
      );
    }

    // 2) Buscar API Saipos e validar dono
    const saiposAPI = await db.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI) {
      return NextResponse.json(
        { success: false, error: "API não encontrada" },
        { status: 404 }
      );
    }

    if (saiposAPI.type !== "saipos") {
      return NextResponse.json(
        { success: false, error: "API não é do tipo Saipos" },
        { status: 400 }
      );
    }

    if (saiposAPI.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "API não pertence ao usuário atual" },
        { status: 403 }
      );
    }

    const apiKey = saiposAPI.apiKey.trim().replace(/^Bearer\s+/i, "");
    const resolvedStoreId = body.storeId || saiposAPI.storeId || saiposAPI.name;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key não encontrada" },
        { status: 401 }
      );
    }

    // 3) Calcular intervalo dos últimos N dias
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));

    console.log(
      `🔄 Sincronizando ${days} dias para apiId=${apiId}, storeId=${resolvedStoreId}`
    );
    console.log(`📅 Período: ${startDate.toISOString()} -> ${endDate.toISOString()}`);

    // 4) APAGAR registros antigos desta API (antes do startDate)
    const deletedOld = await db.salesDaily.deleteMany({
      where: {
        apiId,
        date: { lt: startDate },
      },
    });
    console.log(`🧹 Removidos ${deletedOld.count} registros antigos`);

    // 5) Buscar vendas da Saipos
    const rawSales = await fetchSalesFromSaipos(apiKey, startDate, endDate);
    console.log(`📊 Total de vendas brutas carregadas: ${rawSales.length}`);

    if (rawSales.length === 0) {
      return NextResponse.json({
        success: true,
        apiId,
        storeId: resolvedStoreId,
        startDate,
        endDate,
        daysSynced: 0,
        message: "Nenhuma venda encontrada no período para esta API.",
      });
    }

    // 6) Agregar por dia
    const dailyAggregated = aggregateSalesByDay(rawSales);
    console.log(`📊 ${dailyAggregated.size} dias únicos para sincronizar`);

    // 7) Loop de datas e UPSERT
    const dates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const upserts = [];
    let totalSalesSum = 0;
    let totalOrdersSum = 0;

    for (const date of dates) {
      const dateKey = date.toISOString().split("T")[0];
      const dayData = dailyAggregated.get(dateKey) || {
        totalOrders: 0,
        totalSales: 0,
        channels: {},
      };

      totalSalesSum += dayData.totalSales;
      totalOrdersSum += dayData.totalOrders;

      // Log dos primeiros 3 dias para debug
      if (upserts.length < 3) {
        console.log(`📊 Dia ${dateKey}:`, {
          totalOrders: dayData.totalOrders,
          totalSales: dayData.totalSales,
          channels: dayData.channels,
        });
      }

      upserts.push(
        db.salesDaily.upsert({
          where: {
            sales_daily_api_date_unique: {
              apiId,
              date,
            },
          },
          create: {
            apiId,
            storeId: resolvedStoreId,
            date,
            totalOrders: dayData.totalOrders,
            totalSales: dayData.totalSales,
            channels: dayData.channels,
          },
          update: {
            totalOrders: dayData.totalOrders,
            totalSales: dayData.totalSales,
            channels: dayData.channels,
          },
        })
      );
    }

    await db.$transaction(upserts);
    console.log(`✅ ${upserts.length} dias sincronizados em sales_daily`);
    console.log(`📊 Totais agregados: ${totalOrdersSum} pedidos, R$ ${totalSalesSum.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      apiId,
      storeId: resolvedStoreId,
      startDate,
      endDate,
      daysSynced: upserts.length,
    });
  } catch (error) {
    console.error("❌ Erro na sincronização Saipos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao sincronizar dados",
      },
      { status: 500 }
    );
  }
}
