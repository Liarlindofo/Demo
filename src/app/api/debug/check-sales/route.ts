export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/debug/check-sales - Verificar se ainda existem registros com userId null
export async function GET() {
  try {
    // Buscar os 20 registros mais recentes para verificação
    const rows = await db.salesDaily.findMany({
      take: 20,
      select: {
        userId: true,
        storeId: true,
        date: true,
        totalOrders: true,
      },
      orderBy: { date: "desc" },
    });

    // Contar quantos têm userId null usando SQL raw (já que o schema não permite null)
    const nullCountResult = await db.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) as count FROM sales_daily WHERE "userId" IS NULL OR "userId" = ''`
    );
    const nullCount = Number(nullCountResult[0]?.count || 0);

    // Verificar nos registros retornados se algum tem userId vazio/null
    const hasNullInRecent = rows.some(row => !row.userId || row.userId === "");

    return NextResponse.json({
      success: true,
      recentRows: rows,
      nullUserIdCount: nullCount,
      hasNullValues: nullCount > 0,
      hasNullInRecentRows: hasNullInRecent,
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

