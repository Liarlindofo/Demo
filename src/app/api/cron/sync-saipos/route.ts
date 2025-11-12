import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeBRTWindow, syncSaiposForApi } from '@/lib/saipos/sync'

export const runtime = 'nodejs'

export async function GET() {
  // Cron: run daily 00:05 BRT (scheduled via vercel.json in UTC 03:05)
  const { start, end } = computeBRTWindow(15)

  const apis = await prisma.userAPI.findMany({
    where: { type: 'saipos', enabled: true, storeId: { not: null } },
    select: { id: true, storeId: true },
  })

  const results = []
  for (const api of apis) {
    const res = await syncSaiposForApi({
      apiId: api.id,
      storeId: api.storeId ?? undefined,
      start,
      end,
      initialLoad: false,
    })
    results.push({ apiId: api.id, success: res.success, synced: res.synced, errors: res.errors })
  }

  return NextResponse.json({ ok: true, count: results.length, results })
}

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Verificar se a requisição vem do Vercel Cron (header Authorization)
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

// GET /api/cron/sync-saipos - Sincronizar todas as lojas conectadas
export async function GET(request: Request) {
  try {
    // Verificar autorização (apenas Vercel Cron pode chamar)
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    console.log("🔄 Iniciando sincronização automática de todas as lojas Saipos...");

    // Buscar todas as APIs Saipos conectadas
    const saiposAPIs = await db.userAPI.findMany({
      where: {
        type: "saipos",
        status: "connected",
      },
    });

    if (saiposAPIs.length === 0) {
      console.log("⚠️ Nenhuma API Saipos conectada");
      return NextResponse.json({
        success: true,
        message: "Nenhuma API Saipos conectada",
        synced: 0,
      });
    }

    console.log(`📊 Encontradas ${saiposAPIs.length} API(s) Saipos conectada(s)`);

    // Sincronizar cada loja
    const results = [];
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    // Calcular data de 15 dias atrás (14 dias + hoje = 15 dias)
    const fifteenDaysAgo = new Date(today);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);
    const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split("T")[0];

    // Determinar URL base baseado no ambiente
    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://platefull.com.br"
      : "http://localhost:3000";

    for (const api of saiposAPIs) {
      try {
        const storeId = api.name; // Usar name como storeId

        // Chamar rota de sincronização internamente
        const syncUrl = `${baseUrl}/api/saipos/sync`;
        
        const response = await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiId: api.id,
            storeId: storeId,
            startDate: fifteenDaysAgoStr, // Sincronizar últimos 15 dias
            endDate: todayStr,
            initialLoad: false,
          }),
        });

        const result = await response.json();
        results.push({
          apiId: api.id,
          storeId: storeId,
          success: result.success,
          synced: result.synced || 0,
        });

        console.log(
          `✅ Sincronização concluída para ${storeId}: ${result.synced || 0} registros`
        );
      } catch (error) {
        console.error(`❌ Erro ao sincronizar API ${api.id}:`, error);
        results.push({
          apiId: api.id,
          storeId: api.name,
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    const totalSynced = results.reduce(
      (sum, r) => sum + (r.synced || 0),
      0
    );

    console.log(
      `✅ Sincronização automática concluída: ${totalSynced} registros sincronizados em ${saiposAPIs.length} loja(s)`
    );

    return NextResponse.json({
      success: true,
      message: "Sincronização automática concluída",
      totalSynced,
      results,
    });
  } catch (error) {
    console.error("❌ Erro na sincronização automática:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}






