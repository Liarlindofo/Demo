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

    // Validar que o storeId seja passado, caso contrário usar saiposAPI.name
    const targetStoreId = storeId || saiposAPI.name;

    if (!targetStoreId) {
      return NextResponse.json(
        { success: false, error: "storeId não encontrado" },
        { status: 400 }
      );
    }

    // Calcular período (últimos N dias)
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log(`📅 Período de sincronização: ${startDate} a ${endDate}`);
    console.log(`📊 Store ID usado: ${targetStoreId}`);
    console.log(`📊 API ID usado: ${apiId}`);

    // Chamar rota de vendas via GET com query params
    const vendasUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/saipos/vendas?data_inicial=${encodeURIComponent(startDate)}&data_final=${encodeURIComponent(endDate)}&apiId=${encodeURIComponent(apiId)}&storeId=${encodeURIComponent(targetStoreId)}`;
    
    console.log(`🔗 URL chamada: ${vendasUrl}`);

    const response = await fetch(vendasUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      console.error("❌ Erro na resposta da rota /vendas:", response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao buscar vendas: ${response.status} ${errorText}`,
        },
        { status: response.status || 500 }
      );
    }

    const result = await response.json();

    // Verificar se há dados na resposta
    const vendas = Array.isArray(result?.data) ? result.data : [];
    const totalVendas = vendas.length;

    console.log(`✅ Sincronização manual concluída: ${totalVendas} vendas encontradas`);

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída",
      synced: totalVendas,
      period: { start: startDate, end: endDate },
      data: vendas,
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

