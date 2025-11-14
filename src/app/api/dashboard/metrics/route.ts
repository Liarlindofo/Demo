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

    console.log("⚠️ UI storeId:", storeIdRaw);
    console.log("⚠️ userId:", userId);

    // Validar que o storeId pertence ao usuário
    const validStoreIds = await db.salesDaily.findMany({
      select: { storeId: true },
      where: { userId },
      distinct: ["storeId"],
    });
    
    const validStoreIdList = validStoreIds.map(v => v.storeId);
    console.log("⚠️ StoreIds válidos para este usuário:", validStoreIdList);

    if (!validStoreIdList.includes(storeIdRaw)) {
      return NextResponse.json({ 
        success: false,
        error: `StoreId "${storeIdRaw}" não pertence ao usuário.`,
        available: validStoreIdList
      }, { status: 403 });
    }

    // Usar storeId exato (sem normalização, já validado)
    const targetStoreId = storeIdRaw;

    // janela UTC-3 completa
    const startDate = new Date(`${start}T00:00:00-03:00`);
    const endDate = new Date(`${end}T23:59:59-03:00`);

    console.log("⚠️ Período:", { start, end, startDate: startDate.toISOString(), endDate: endDate.toISOString() });

    const where = {
      userId,
      date: { gte: startDate, lte: endDate },
      storeId: targetStoreId,
    };

    console.log("⚠️ Where aplicado:", JSON.stringify(where, null, 2));

    // Verificar quantos registros existem antes do filtro
    const totalCount = await db.salesDaily.count({
      where: { userId },
    });
    const countWithStoreId = await db.salesDaily.count({
      where: { userId, storeId: targetStoreId },
    });
    const countWithDateRange = await db.salesDaily.count({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });
    console.log("⚠️ Contagens de debug:");
    console.log("  - Total registros para userId:", totalCount);
    console.log("  - Registros com storeId normalizado:", countWithStoreId);
    console.log("  - Registros no período:", countWithDateRange);

    // Série diária (para gráficos / tabela)
    const rows = await db.salesDaily.findMany({
      where,
      orderBy: { date: "asc" },
    });

    console.log("⚠️ Registros encontrados após filtro completo:", rows.length);
    if (rows.length > 0) {
      console.log("⚠️ Primeiro registro:", {
        storeId: rows[0].storeId,
        date: rows[0].date,
        totalOrders: rows[0].totalOrders,
      });
    }

    // Agregados dos cards
    // OBS: Prisma aggregate com Decimal -> converter para Number
    const agg = await db.salesDaily.aggregate({
      where,
      _sum: {
        totalOrders: true,
        canceledOrders: true,
        totalSales: true,
        qtdDelivery: true,
        qtdBalcao: true,
        qtdIFood: true,
        qtdTelefone: true,
        qtdCentralPedidos: true,
        qtdDeliveryDireto: true,
        totalItems: true,
        totalDeliveryFee: true,
        totalAdditions: true,
        totalDiscounts: true,
      },
      _avg: {
        averageTicketDelivery: true,
        averageTicketBalcao: true,
      },
    });

    const sum = agg._sum;
    const avg = agg._avg;

    const toNum = (v: unknown): number => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "number") return v;
      const num = Number(v);
      return Number.isNaN(num) ? 0 : num;
    };

    const payload = {
      cards: {
        totalOrders: toNum(sum.totalOrders),
        canceledOrders: toNum(sum.canceledOrders),
        totalSales: toNum(sum.totalSales),
        averageTicketDelivery: toNum(avg.averageTicketDelivery),
        averageTicketBalcao: toNum(avg.averageTicketBalcao),
        qtdDelivery: toNum(sum.qtdDelivery),
        qtdBalcao: toNum(sum.qtdBalcao),
        qtdIFood: toNum(sum.qtdIFood),
        qtdTelefone: toNum(sum.qtdTelefone),
        qtdCentralPedidos: toNum(sum.qtdCentralPedidos),
        qtdDeliveryDireto: toNum(sum.qtdDeliveryDireto),
        totalItems: toNum(sum.totalItems),
        totalDeliveryFee: toNum(sum.totalDeliveryFee),
        totalAdditions: toNum(sum.totalAdditions),
        totalDiscounts: toNum(sum.totalDiscounts),
      },
      series: rows.map((r) => ({
        date: r.date,
        totalOrders: r.totalOrders,
        canceledOrders: r.canceledOrders ?? 0,
        totalSales: Number(r.totalSales),
        averageTicketDelivery: r.averageTicketDelivery ? Number(r.averageTicketDelivery) : 0,
        averageTicketBalcao: r.averageTicketBalcao ? Number(r.averageTicketBalcao) : 0,
        qtdDelivery: r.qtdDelivery ?? 0,
        qtdBalcao: r.qtdBalcao ?? 0,
        qtdIFood: r.qtdIFood ?? 0,
        qtdTelefone: r.qtdTelefone ?? 0,
        qtdCentralPedidos: r.qtdCentralPedidos ?? 0,
        qtdDeliveryDireto: r.qtdDeliveryDireto ?? 0,
        totalItems: r.totalItems ?? 0,
        totalDeliveryFee: r.totalDeliveryFee ? Number(r.totalDeliveryFee) : 0,
        totalAdditions: r.totalAdditions ? Number(r.totalAdditions) : 0,
        totalDiscounts: r.totalDiscounts ? Number(r.totalDiscounts) : 0,
      })),
      debug: { where, count: rows.length },
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("dashboard metrics error:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

