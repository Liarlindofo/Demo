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
      // Listar todas as APIs do usuário para obter os storeIds
      const apis = await db.userAPI.findMany({
        where: { userId, type: "saipos" },
        select: { storeId: true, name: true },
      });

      const storeIds = apis.map(a => a.storeId).filter(Boolean);

      return NextResponse.json({
        message: "storeId não fornecido. StoreIds disponíveis:",
        storeIds,
        totalStores: storeIds.length,
        apis: apis.map(a => ({ storeId: a.storeId, name: a.name })),
      });
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

    // Contar total de registros usando apiId
    const totalRecords = await db.salesDaily.count({
      where: { apiId: api.id, storeId },
    });

    // Buscar todos os registros usando apiId
    const allRecords = await db.salesDaily.findMany({
      where: { apiId: api.id, storeId },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Buscar registros mais recentes
    const recentRecords = await db.salesDaily.findMany({
      where: { apiId: api.id, storeId },
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
      apiId: api.id,
      stats,
      recentRecords: recentRecords.map(r => ({
        date: r.date,
        totalSales: r.totalSales ? Number(r.totalSales) : 0,
        totalOrders: r.totalOrders,
      })),
      allRecords: allRecords.map(r => ({
        date: r.date,
        totalSales: r.totalSales ? Number(r.totalSales) : 0,
        totalOrders: r.totalOrders,
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
