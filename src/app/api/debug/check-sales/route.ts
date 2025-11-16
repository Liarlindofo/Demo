export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Contar quantos têm userId null
    const nullCount = await db.salesDaily.count({
      where: {
        OR: [
          { userId: null },
          { userId: "" },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      recentRows: rows,
      nullUserIdCount: nullCount,
      hasNullValues: nullCount > 0,
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

