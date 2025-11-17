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

    // Período em BRT
    const startDate = new Date(`${start}T00:00:00-03:00`);
    const endDate = new Date(`${end}T23:59:59-03:00`);

    // Buscar dados de sales_daily usando apiId
    const where = {
      apiId: api.id,
      date: { gte: startDate, lte: endDate },
    };

    // Série diária (para gráficos)
    const rows = await db.salesDaily.findMany({
      where,
      orderBy: { date: "asc" },
    });

    // Agregados para os cards
    const agg = await db.salesDaily.aggregate({
      where,
      _sum: {
        totalOrders: true,
        totalSales: true,
      },
    });

    const sum = agg._sum;

    const toNum = (v: unknown): number => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "number") return v;
      const num = Number(v);
      return Number.isNaN(num) ? 0 : num;
    };

    // Extrair canais agregados
    const channelsAggregated: Record<string, number> = {};
    rows.forEach((row) => {
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
        totalOrders: toNum(sum.totalOrders),
        totalSales: toNum(sum.totalSales),
        // Canais agregados
        channels: channelsAggregated,
      },
      series: rows.map((r) => ({
        date: r.date,
        totalOrders: r.totalOrders,
        totalSales: Number(r.totalSales),
        channels: (r.channels && typeof r.channels === 'object') 
          ? (r.channels as Record<string, unknown>)
          : {},
      })),
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("dashboard metrics error:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
