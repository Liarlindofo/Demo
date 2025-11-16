export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

// GET /api/debug/sales - Debug: Verificar dados no banco
export async function GET(request: Request) {
  try {
    // Autenticação obrigatória
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

    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    if (!storeId) {
      // Listar todos os storeIds únicos (apenas do usuário autenticado)
      const allStores = await db.salesDaily.findMany({
        where: { userId },
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

    // Contar total de registros (apenas do usuário autenticado)
    const totalRecords = await db.salesDaily.count({
      where: { userId, storeId },
    });

    // Buscar todos os registros (apenas do usuário autenticado)
    const allRecords = await db.salesDaily.findMany({
      where: { userId, storeId },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Buscar registros mais recentes (apenas do usuário autenticado)
    const recentRecords = await db.salesDaily.findMany({
      where: { userId, storeId },
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
        averageTicketDelivery: r.averageTicketDelivery,
        averageTicketBalcao: r.averageTicketBalcao,
      })),
      allRecords: allRecords.map(r => ({
        date: r.date,
        totalSales: r.totalSales,
        totalOrders: r.totalOrders,
        averageTicketDelivery: r.averageTicketDelivery,
        averageTicketBalcao: r.averageTicketBalcao,
      })),
    });
  } catch (error) {
    console.error(" Erro ao buscar dados de debug:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
