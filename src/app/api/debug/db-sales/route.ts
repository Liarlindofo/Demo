export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

// GET /api/debug/db-sales - Debug: Verificar dados no banco
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
      return NextResponse.json(
        { error: "storeId é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`🔍 [DEBUG] Verificando dados no banco para storeId: "${storeId}"`);

    // Contar total de registros (apenas do usuário autenticado)
    const totalCount = await db.salesDaily.count({
      where: { userId, storeId },
    });

    // Buscar todos os registros (sem filtro de data, apenas do usuário autenticado)
    const allRecords = await db.salesDaily.findMany({
      where: { userId, storeId },
      select: {
        id: true,
        storeId: true,
        date: true,
        totalSales: true,
        totalOrders: true,
        averageTicketDelivery: true,
        averageTicketBalcao: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { date: "desc" },
      take: 50, // Limitar a 50 para não sobrecarregar
    });

    // Buscar registros mais recentes (apenas do usuário autenticado)
    const recentRecords = await db.salesDaily.findMany({
      where: { userId, storeId },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Buscar registros mais antigos (apenas do usuário autenticado)
    const oldestRecords = await db.salesDaily.findMany({
      where: { userId, storeId },
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
        userId,
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
        averageTicketDelivery: r.averageTicketDelivery,
        averageTicketBalcao: r.averageTicketBalcao,
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

