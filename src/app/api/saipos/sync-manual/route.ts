import { NextRequest, NextResponse } from 'next/server'
import { computeBRTWindow, syncSaiposForApi } from '@/lib/saipos/sync'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const apiId = String(body.apiId ?? '').trim()
    const overrideStoreId = body.storeId ? String(body.storeId) : undefined
    const days = Number(body.days ?? 15)

    if (!apiId) {
      return NextResponse.json({ success: false, message: 'apiId é obrigatório' }, { status: 400 })
    }
    const { start, end } = computeBRTWindow(Number.isFinite(days) && days > 0 ? days : 15)

    const result = await syncSaiposForApi({
      apiId,
      storeId: overrideStoreId,
      start,
      end,
      initialLoad: false,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 409 })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Erro inesperado' },
      { status: 500 },
    )
  }
}

export const runtime = "nodejs";
import { NextResponse } from "next/server";

// POST /api/saipos/sync-manual - Sincronização manual (pode ser chamada pelo frontend)
// Esta rota é um wrapper que chama a rota /api/saipos/sync internamente
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

    // Calcular período (últimos N dias)
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];
    const startDate = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log(`📅 Período de sincronização: ${startDate} a ${endDate} (${days} dias)`);

    // Chamar a rota de sincronização diretamente (sem fetch HTTP)
    // Importar dinamicamente para evitar problemas de circular dependency
    const { POST: syncPOST } = await import("../sync/route");
    
    // Determinar URL base baseado no ambiente
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://platefull.com.br"
      : "http://localhost:3000";
    
    // Criar um novo Request com os parâmetros corretos
    const syncRequest = new Request(`${baseUrl}/api/saipos/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiId,
        storeId,
        startDate,
        endDate,
        initialLoad: false,
      }),
    });

    // Chamar a função POST da rota de sincronização
    const syncResponse = await syncPOST(syncRequest);
    const syncResult = await syncResponse.json();

    if (!syncResult.success) {
      console.error("❌ Erro na sincronização:", syncResult.error);
      return NextResponse.json(
        {
          success: false,
          error: syncResult.error || "Erro ao sincronizar dados",
        },
        { status: syncResponse.status || 500 }
      );
    }

    console.log(`✅ Sincronização manual concluída: ${syncResult.synced || 0} registros sincronizados`);

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída",
      synced: syncResult.synced || 0,
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

