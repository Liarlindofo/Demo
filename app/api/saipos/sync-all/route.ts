export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

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

    const channel = String(saleObj.origin_name ?? saleObj.channel ?? "outros").toLowerCase();
    dayData.channels[channel] = (dayData.channels[channel] || 0) + 1;
  }

  return dailyData;
}

/**
 * Sincroniza uma API específica
 */
async function syncApi(apiId: string, apiKey: string, storeId: string, days = 15): Promise<{
  success: boolean;
  syncedDays: number;
  error?: string;
}> {
  try {
    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));

    // Apagar registros antigos
    await db.salesDaily.deleteMany({
      where: { apiId, date: { lt: startDate } },
    });

    // Buscar vendas
    const rawSales = await fetchSalesFromSaipos(apiKey, startDate, endDate);
    if (rawSales.length === 0) {
      return { success: true, syncedDays: 0 };
    }

    // Agregar por dia
    const dailyAggregated = aggregateSalesByDay(rawSales);

    // Loop de datas e UPSERT
    const dates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const upserts = [];
    for (const date of dates) {
      const dateKey = date.toISOString().split("T")[0];
      const dayData = dailyAggregated.get(dateKey) || {
        totalOrders: 0,
        totalSales: 0,
        channels: {},
      };

      upserts.push(
        db.salesDaily.upsert({
          where: {
            sales_daily_api_date_unique: { apiId, date },
          },
          create: {
            apiId,
            storeId,
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
    return { success: true, syncedDays: upserts.length };
  } catch (error) {
    return {
      success: false,
      syncedDays: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Rota para sincronizar TODAS as APIs Saipos do usuário autenticado
 */
export async function POST() {
  try {
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

    // Buscar todas as APIs Saipos do usuário
    const apis = await db.userAPI.findMany({
      where: { userId, type: "saipos" },
    });

    if (apis.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma API Saipos encontrada",
        apisSynced: [],
        days: 15,
      });
    }

    console.log(`🔄 Sync-all: ${apis.length} APIs Saipos`);

    const apisSynced = [];
    for (const api of apis) {
      if (!api.apiKey) {
        console.log(`⚠️  API ${api.name} sem API key, pulando...`);
        continue;
      }

      const apiKey = api.apiKey.trim().replace(/^Bearer\s+/i, "");
      const storeId = api.storeId || api.name;

      console.log(`📦 Sincronizando API: ${api.name} (${api.id})`);
      const result = await syncApi(api.id, apiKey, storeId, 15);

      if (result.success) {
        apisSynced.push({
          apiId: api.id,
          name: api.name,
          syncedDays: result.syncedDays,
        });
        console.log(`✅ ${api.name}: ${result.syncedDays} dias`);
      } else {
        console.log(`❌ ${api.name}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${apisSynced.length}/${apis.length} APIs`,
      apisSynced,
      days: 15,
    });
  } catch (error) {
    console.error("❌ Erro no sync-all:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao sincronizar APIs",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}

