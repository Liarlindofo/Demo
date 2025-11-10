export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/debug/db-sales - Debug: Verificar dados no banco
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`🔍 [DEBUG] Verificando dados no banco para storeId: "${storeId}"`);

    // Contar total de registros
    const totalCount = await db.salesDaily.count({
      where: { storeId },
    });

    // Buscar todos os registros (sem filtro de data)
    const allRecords = await db.salesDaily.findMany({
      where: { storeId },
      select: {
        id: true,
        storeId: true,
        date: true,
        totalSales: true,
        totalOrders: true,
        averageTicket: true,
        uniqueCustomers: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { date: "desc" },
      take: 50, // Limitar a 50 para não sobrecarregar
    });

    // Buscar registros mais recentes
    const recentRecords = await db.salesDaily.findMany({
      where: { storeId },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Buscar registros mais antigos
    const oldestRecords = await db.salesDaily.findMany({
      where: { storeId },
      orderBy: { date: "asc" },
      take: 10,
    });

    // Verificar datas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fifteenDaysAgo = new Date(today);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);

    const recordsInLast15Days = await db.salesDaily.count({
      where: {
        storeId,
        date: {
          gte: fifteenDaysAgo,
          lte: today,
        },
      },
    });

    return NextResponse.json({
      storeId,
      totalRecords: totalCount,
      recordsInLast15Days,
      allRecords: allRecords.map(r => ({
        id: r.id,
        storeId: r.storeId,
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalSales: r.totalSales,
        totalOrders: r.totalOrders,
        averageTicket: r.averageTicket,
        uniqueCustomers: r.uniqueCustomers,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      recentRecords: recentRecords.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalSales: r.totalSales,
        totalOrders: r.totalOrders,
      })),
      oldestRecords: oldestRecords.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalSales: r.totalSales,
        totalOrders: r.totalOrders,
      })),
      dateRange: {
        today: today.toISOString().split('T')[0],
        fifteenDaysAgo: fifteenDaysAgo.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar dados de debug:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

