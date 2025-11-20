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

    // Buscar a API pelo storeId e userId para obter o apiId
    const api = await db.userAPI.findFirst({
      where: {
        storeId: storeId,
        userId: userId,
        type: "saipos",
      },
    });

    if (!api) {
      return NextResponse.json(
        { error: "API não encontrada para este storeId" },
        { status: 404 }
      );
    }

    console.log(`🔍 [DEBUG] Verificando dados no banco para storeId: "${storeId}", apiId: "${api.id}"`);

    // Contar total de registros usando apiId
    const totalCount = await db.salesDaily.count({
      where: { apiId: api.id, storeId },
    });

    // Buscar todos os registros usando apiId
    const allRecords = await db.salesDaily.findMany({
      where: { apiId: api.id, storeId },
      select: {
        id: true,
        apiId: true,
        storeId: true,
        date: true,
        totalSales: true,
        totalOrders: true,
        channels: true,
        createdAt: true,
      },
      orderBy: { date: "desc" },
      take: 50, // Limitar a 50 para não sobrecarregar
    });

    // Buscar registros mais recentes
    const recentRecords = await db.salesDaily.findMany({
      where: { apiId: api.id, storeId },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Buscar registros mais antigos
    const oldestRecords = await db.salesDaily.findMany({
      where: { apiId: api.id, storeId },
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
        apiId: api.id,
        storeId,
        date: {
          gte: fifteenDaysAgo,
          lte: today,
        },
      },
    });

    return NextResponse.json({
      storeId,
      apiId: api.id,
      totalRecords: totalCount,
      recordsInLast15Days,
      allRecords: allRecords.map(r => ({
        id: r.id,
        apiId: r.apiId,
        storeId: r.storeId,
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalSales: r.totalSales ? Number(r.totalSales) : 0,
        totalOrders: r.totalOrders,
        channels: r.channels,
        createdAt: r.createdAt,
      })),
      recentRecords: recentRecords.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalSales: r.totalSales ? Number(r.totalSales) : 0,
        totalOrders: r.totalOrders,
      })),
      oldestRecords: oldestRecords.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalSales: r.totalSales ? Number(r.totalSales) : 0,
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
