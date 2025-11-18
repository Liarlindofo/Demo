export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

export async function GET(req: Request) {
  try {
    const stackUser = await stackServerApp.getUser({ or: "return-null" });
    if (!stackUser) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail || undefined,
      displayName: stackUser.displayName || undefined,
      profileImageUrl: stackUser.profileImageUrl || undefined,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    });
    const userId = dbUser.id;

    const url = new URL(req.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    const storeIdRaw = url.searchParams.get("storeId");

    if (!start || !end || !storeIdRaw) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    console.log("📊 Dashboard metrics:", { storeIdRaw, start, end, userId });

    // Validar que o storeId pertence ao usuário usando user_apis
    const api = await db.userAPI.findFirst({
      where: {
        storeId: storeIdRaw,
        userId: userId,
        type: "saipos",
      },
    });

    if (!api) {
      const availableApis = await db.userAPI.findMany({
        where: { userId, type: "saipos" },
        select: { storeId: true, name: true },
      });
      return NextResponse.json({ 
        success: false,
        error: `StoreId "${storeIdRaw}" não pertence ao usuário.`,
        available: availableApis.map(a => ({ storeId: a.storeId, name: a.name }))
      }, { status: 403 });
    }

    console.log("✅ API validada:", { apiId: api.id, name: api.name });

    // Período em UTC (normalizado)
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);

    // Buscar dados de sales_daily usando apiId
    const where = {
      apiId: api.id,
      date: { gte: startDate, lte: endDate },
    };

    // Série diária (para gráficos)
    const rows = await db.salesDaily.findMany({
      where,
      select: {
        date: true,
        totalOrders: true,
        totalSales: true,
        uniqueCustomers: true,
        channels: true,
      },
      orderBy: { date: "asc" },
    });

    console.log(`📊 Registros encontrados: ${rows.length}`);

    // Agregados para os cards
    let totalOrders = 0;
    let totalSales = 0;
    let totalUniqueCustomers = 0;
    const channelsAggregated: Record<string, number> = {};

    rows.forEach((row) => {
      totalOrders += row.totalOrders;
      totalSales += row.totalSales;
      totalUniqueCustomers += (row.uniqueCustomers || 0);

      // Agregar canais
      if (row.channels && typeof row.channels === 'object') {
        const channels = row.channels as Record<string, unknown>;
        Object.keys(channels).forEach((channel) => {
          const count = Number(channels[channel]) || 0;
          channelsAggregated[channel] = (channelsAggregated[channel] || 0) + count;
        });
      }
    });

    const payload = {
      cards: {
        totalOrders,
        totalSales,
        averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
        uniqueCustomers: totalUniqueCustomers,
        channels: channelsAggregated,
      },
      series: rows.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalOrders: r.totalOrders,
        totalSales: r.totalSales,
        averageTicket: r.totalOrders > 0 ? r.totalSales / r.totalOrders : 0,
        uniqueCustomers: r.uniqueCustomers || 0,
        channels: (r.channels && typeof r.channels === 'object') 
          ? (r.channels as Record<string, unknown>)
          : {},
      })),
    };

    console.log("📊 Payload final:", {
      totalOrders,
      totalSales,
      averageTicket: totalOrders > 0 ? totalSales / totalOrders : 0,
      seriesCount: rows.length,
      firstDay: rows.length > 0 ? {
        date: rows[0].date,
        totalOrders: rows[0].totalOrders,
        totalSales: rows[0].totalSales,
      } : null,
    });

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("❌ Dashboard metrics error:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
