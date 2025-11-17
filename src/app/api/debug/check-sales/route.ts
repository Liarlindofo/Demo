export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/debug/check-sales - Verificar registros em sales_daily
export async function GET() {
  try {
    // Buscar os 20 registros mais recentes para verificação
    const rows = await db.salesDaily.findMany({
      take: 20,
      select: {
        id: true,
        apiId: true,
        storeId: true,
        date: true,
        totalOrders: true,
        totalSales: true,
      },
      orderBy: { date: "desc" },
    });

    // Contar quantos têm apiId null usando SQL raw
    const nullCountResult = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM sales_daily WHERE "apiId" IS NULL OR "apiId" = ''
    `;
    const nullCount = Number(nullCountResult[0]?.count || 0);

    // Verificar nos registros retornados se algum tem apiId vazio/null
    const hasNullInRecent = rows.some(row => !row.apiId || row.apiId === "");

    // Contar total de registros
    const totalCount = await db.salesDaily.count();

    return NextResponse.json({
      success: true,
      recentRows: rows,
      nullApiIdCount: nullCount,
      hasNullValues: nullCount > 0,
      hasNullInRecentRows: hasNullInRecent,
      totalRecords: totalCount,
    });
  } catch (error) {
    console.error("❌ Erro ao verificar registros:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
