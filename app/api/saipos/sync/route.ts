export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeSalesResponse, type SaiposRawSale } from "@/lib/saipos-api";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

interface SyncRequest {
  apiId?: string;
  days?: number;
}

const BRT_OFFSET = "-03:00";

function computeBRTWindow(days = 15): { start: Date; end: Date } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const now = new Date();

  const toYmd = (d: Date) => {
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const da = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${da}`;
  };

  const endLocalYmd = toYmd(now);
  const startRef = new Date(now);
  startRef.setDate(startRef.getDate() - (days - 1));
  const startLocalYmd = toYmd(startRef);

  const startDate = new Date(`${startLocalYmd}T00:00:00${BRT_OFFSET}`);
  const endDate = new Date(`${endLocalYmd}T23:59:59${BRT_OFFSET}`);
  return { start: startDate, end: endDate };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    // 1) Autenticação via Stack Auth
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

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      return NextResponse.json(
        { success: false, error: "API Saipos não encontrada" },
        { status: 404 }
      );
    }

    if (saiposAPI.userId !== userId) {
      console.error("API não pertence ao usuário atual", {
        apiUserId: saiposAPI.userId,
        userId,
      });
      return NextResponse.json(
        { success: false, error: "API não pertence ao usuário atual" },
        { status: 403 }
      );
    }

    const apiKey = saiposAPI.apiKey;
    const targetStoreId = saiposAPI.storeId;

    if (!targetStoreId) {
      return NextResponse.json(
        { success: false, error: "StoreId não configurado na API" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key não encontrada" },
        { status: 401 }
      );
    }

    const cleanToken = apiKey.trim().replace(/^Bearer\s+/i, "");
    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    // 3) Janela deslizante de N dias (default 15)
    const { start, end } = computeBRTWindow(days);

    console.log(
      `🔄 Sincronizando sales_daily para apiId=${apiId}, storeId=${targetStoreId}, período ${start.toISOString()} -> ${end.toISOString()}`
    );

    // 4) Apagar registros antigos desta API (antes do start)
    const deletedOld = await db.salesDaily.deleteMany({
      where: {
        apiId,
        date: { lt: start },
      },
    });
    console.log(
      `🧹 Removidos ${deletedOld.count} registros antigos de sales_daily para apiId=${apiId}`
    );

    // 5) Buscar vendas reais da Saipos para o período inteiro
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    async function fetchSalesFromSaiposPeriod(): Promise<SaiposRawSale[]> {
      const allSales: unknown[] = [];
      const limit = 200;
      let offset = 0;
      let totalRequests = 0;

      while (true) {
        const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(
          startISO
        )}&p_filter_date_end=${encodeURIComponent(
          endISO
        )}&p_limit=${limit}&p_offset=${offset}`;

        totalRequests++;
        console.log(
          `📥 [Saipos] Página ${totalRequests} (offset=${offset}) para apiId=${apiId}`
        );

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${cleanToken}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error(
            "❌ Erro na API Saipos:",
            res.status,
            res.statusText,
            txt.slice(0, 300)
          );
          break;
        }

        let pageData: unknown;
        try {
          const text = await res.text();
          pageData = text ? JSON.parse(text) : null;
        } catch (err) {
          console.error("❌ Erro ao parsear JSON da Saipos:", err);
          break;
        }

        // Type guard para verificar se o objeto tem propriedades data ou items
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

        if (pageArray.length === 0) {
          console.log("⚠️ Página vazia, encerrando paginação.");
          break;
        }

        allSales.push(...pageArray);
        offset += limit;

        if (totalRequests >= 100) {
          console.warn(
            "⚠️ Limite de 100 requisições atingido, parando paginação."
          );
          break;
        }

        await sleep(800);
      }

      console.log(`📊 Total bruto de vendas carregadas: ${allSales.length}`);
      return allSales as SaiposRawSale[];
    }

    const rawSales = await fetchSalesFromSaiposPeriod();
    const normalized = normalizeSalesResponse(rawSales);

    console.log(
      `📊 ${normalized.length} registros normalizados para agregação diária em sales_daily`
    );

    if (normalized.length === 0) {
      return NextResponse.json({
        success: true,
        apiId,
        storeId: targetStoreId,
        startDate: start,
        endDate: end,
        daysSynced: 0,
        message: "Nenhuma venda encontrada no período para esta API.",
      });
    }

    // 6) UPSERT em sales_daily por (apiId, date)
    const upserts = normalized.map((data) => {
      const date = new Date(data.date);
      return db.salesDaily.upsert({
        where: {
          sales_daily_api_date_unique: {
            apiId,
            date,
          },
        },
        create: {
          apiId,
          storeId: targetStoreId,
          date,
          totalOrders: data.totalOrders,
          totalSales: data.totalSales,
          channels: {
            ifood: data.qtdIFood,
            telefone: data.qtdTelefone,
            centralPedidos: data.qtdCentralPedidos,
            deliveryDireto: data.qtdDeliveryDireto,
            canceledOrders: data.canceledOrders,
            qtdDelivery: data.qtdDelivery,
            qtdBalcao: data.qtdBalcao,
            totalItems: data.totalItems,
            totalDeliveryFee: data.totalDeliveryFee || 0,
            totalAdditions: data.totalAdditions || 0,
            totalDiscounts: data.totalDiscounts || 0,
            averageTicketDelivery: data.averageTicketDelivery || 0,
            averageTicketBalcao: data.averageTicketBalcao || 0,
          },
        },
        update: {
          totalOrders: data.totalOrders,
          totalSales: data.totalSales,
          channels: {
            ifood: data.qtdIFood,
            telefone: data.qtdTelefone,
            centralPedidos: data.qtdCentralPedidos,
            deliveryDireto: data.qtdDeliveryDireto,
            canceledOrders: data.canceledOrders,
            qtdDelivery: data.qtdDelivery,
            qtdBalcao: data.qtdBalcao,
            totalItems: data.totalItems,
            totalDeliveryFee: data.totalDeliveryFee || 0,
            totalAdditions: data.totalAdditions || 0,
            totalDiscounts: data.totalDiscounts || 0,
            averageTicketDelivery: data.averageTicketDelivery || 0,
            averageTicketBalcao: data.averageTicketBalcao || 0,
          },
        },
      });
    });

    await db.$transaction(upserts);
    console.log(`✅ ${upserts.length} dias sincronizados em sales_daily`);

    return NextResponse.json({
      success: true,
      apiId,
      storeId: targetStoreId,
      startDate: start,
      endDate: end,
      daysSynced: upserts.length,
    });
  } catch (error) {
    console.error("❌ Erro na sincronização Saipos (sales_daily):", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}