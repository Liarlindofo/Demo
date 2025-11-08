export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/debug/sales - Debug: Verificar dados no banco
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    if (!storeId) {
      // Listar todos os storeIds únicos
      const allStores = await db.salesDaily.findMany({
        select: { storeId: true },
        distinct: ["storeId"],
      });
      
      const storeIds = allStores.map(s => s.storeId);
      
      return NextResponse.json({
        message: "storeId não fornecido. StoreIds disponíveis:",
        storeIds,
        totalStores: storeIds.length,
      });
    }

    // Contar total de registros
    const totalRecords = await db.salesDaily.count({
      where: { storeId: storeId },
    });

    // Buscar todos os registros
    const allRecords = await db.salesDaily.findMany({
      where: { storeId: storeId },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Buscar registros mais recentes
    const recentRecords = await db.salesDaily.findMany({
      where: { storeId: storeId },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Estatísticas
    const stats = {
      totalRecords,
      oldestDate: allRecords.length > 0 ? allRecords[allRecords.length - 1].date : null,
      newestDate: allRecords.length > 0 ? allRecords[0].date : null,
      dateRange: allRecords.length > 0 
        ? {
            from: allRecords[allRecords.length - 1].date,
            to: allRecords[0].date,
          }
        : null,
    };

    return NextResponse.json({
      storeId,
      stats,
      recentRecords: recentRecords.map(r => ({
        date: r.date,
        totalSales: r.totalSales,
        totalOrders: r.totalOrders,
        averageTicket: r.averageTicket,
        uniqueCustomers: r.uniqueCustomers,
      })),
      allRecords: allRecords.map(r => ({
        date: r.date,
        totalSales: r.totalSales,
        totalOrders: r.totalOrders,
        averageTicket: r.averageTicket,
        uniqueCustomers: r.uniqueCustomers,
      })),
    });
  } catch (error) {
    console.error("❌ Erro ao buscar dados de debug:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

