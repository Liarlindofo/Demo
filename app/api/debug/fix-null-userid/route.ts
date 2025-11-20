export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/debug/fix-null-userid - Corrigir registros com userId null
export async function POST() {
  try {
    console.log("🔧 Iniciando correção de registros com userId null...");

    // 1. Buscar todas as user APIs do tipo Saipos
    const apis = await db.userAPI.findMany({
      where: { type: "saipos" },
      select: { id: true, userId: true, storeId: true },
    });

    console.log(`📊 Encontradas ${apis.length} APIs Saipos`);

    let totalFixed = 0;

    // 2. Para cada API, corrigir registros com userId null ou vazio usando SQL raw
    for (const api of apis) {
      if (!api.userId || !api.storeId) {
        console.warn(`⚠️ API ${api.id} sem userId ou storeId, pulando...`);
        continue;
      }

      // Usar SQL raw para atualizar registros com userId null ou vazio
      const result = await db.$executeRaw`
        UPDATE sales_daily 
        SET "userId" = ${api.userId}
        WHERE "storeId" = ${api.storeId} 
          AND ("userId" IS NULL OR "userId" = '')
      `;

      if (result > 0) {
        console.log(`✅ API ${api.id} (storeId: ${api.storeId}): ${result} registros corrigidos`);
        totalFixed += result;
      }
    }

    console.log(`✅ Correção concluída: ${totalFixed} registros corrigidos`);

    return NextResponse.json({
      success: true,
      fixedRows: totalFixed,
      apisChecked: apis.length,
    });
  } catch (error) {
    console.error("❌ Erro ao corrigir registros:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

