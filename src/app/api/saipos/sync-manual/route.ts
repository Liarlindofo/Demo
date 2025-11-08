export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/saipos/sync-manual - Sincronização manual (pode ser chamada pelo frontend)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiId, storeId, days = 15 } = body;

    if (!apiId) {
      return NextResponse.json(
        { success: false, error: "apiId é obrigatório" },
        { status: 400 }
      );
    }

    console.log("🔄 Iniciando sincronização manual...", { apiId, storeId, days });

    // Buscar API do banco
    const saiposAPI = await db.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      return NextResponse.json(
        { success: false, error: "API Saipos não encontrada" },
        { status: 404 }
      );
    }

    const targetStoreId = storeId || saiposAPI.name;

    // Calcular período (últimos N dias)
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log(`📅 Período de sincronização: ${startDate} a ${endDate}`);

    // Chamar rota de sincronização
    const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/saipos/sync`;
    
    const response = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiId: apiId,
        storeId: targetStoreId,
        startDate: startDate,
        endDate: endDate,
        initialLoad: false,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("❌ Erro na sincronização:", result);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Erro ao sincronizar",
        },
        { status: response.status || 500 }
      );
    }

    console.log(`✅ Sincronização manual concluída: ${result.synced || 0} registros`);

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída",
      synced: result.synced || 0,
      period: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error("❌ Erro na sincronização manual:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

