export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";
import { aggregateSalesData } from "@/lib/sales-aggregation";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/saipos/aggregate
 * Agrega dados de vendas individuais (tabela Sale) para dados diários (tabela SalesDaily)
 * 
 * Body (opcional):
 * - apiId: ID da API (se não fornecido, agrega todas as APIs do usuário)
 * - days: Número de dias para agregar (padrão: 15)
 */
export async function POST(request: Request) {
  try {
    console.log("📊 [POST /api/saipos/aggregate] Iniciando agregação de dados...");

    // Autenticação
    const stackUser = await stackServerApp.getUser({ or: "return-null" });
    if (!stackUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail || undefined,
      displayName: stackUser.displayName || undefined,
      profileImageUrl: stackUser.profileImageUrl || undefined,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    });
    const userId = dbUser.id;

    // Ler parâmetros do body
    let body: { apiId?: string; days?: number } = {};
    try {
      body = await request.json();
    } catch {
      // Body vazio é permitido
    }

    const { apiId, days = 15 } = body;

    // Calcular período
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    console.log(`📊 Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`);

    // Se apiId foi fornecido, agregar apenas essa API
    if (apiId) {
      // Validar que a API pertence ao usuário
      const api = await prisma.userAPI.findFirst({
        where: {
          id: apiId,
          userId: userId,
          type: "saipos",
        },
      });

      if (!api) {
        return NextResponse.json(
          { error: "API não encontrada ou não pertence ao usuário" },
          { status: 404 }
        );
      }

      console.log(`📊 Agregando dados para API: ${api.name} (${api.id})`);

      const result = await aggregateSalesData(
        api.id,
        api.storeId,
        startDate,
        endDate
      );

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? `Dados agregados com sucesso para ${api.name}`
          : `Erro ao agregar dados para ${api.name}`,
        data: {
          apiId: api.id,
          apiName: api.name,
          storeId: api.storeId,
          daysAggregated: result.daysAggregated,
          totalSales: result.totalSales,
          totalOrders: result.totalOrders,
          uniqueCustomers: result.uniqueCustomers,
          period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          },
          errors: result.errors,
        },
      });
    }

    // Se apiId não foi fornecido, agregar todas as APIs do usuário
    const apis = await prisma.userAPI.findMany({
      where: {
        userId: userId,
        type: "saipos",
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        storeId: true,
      },
    });

    console.log(`📊 Encontradas ${apis.length} APIs ativas para agregar`);

    if (apis.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma API ativa encontrada para o usuário",
        data: {
          apisProcessed: 0,
          results: [],
        },
      });
    }

    // Agregar dados para todas as APIs
    const results = [];
    let totalDaysAggregated = 0;
    let totalErrors: string[] = [];

    for (const api of apis) {
      try {
        console.log(`📊 Processando API: ${api.name} (${api.id})`);

        const result = await aggregateSalesData(
          api.id,
          api.storeId,
          startDate,
          endDate
        );

        results.push({
          apiId: api.id,
          apiName: api.name,
          storeId: api.storeId,
          success: result.success,
          daysAggregated: result.daysAggregated,
          totalSales: result.totalSales,
          totalOrders: result.totalOrders,
          uniqueCustomers: result.uniqueCustomers,
          errors: result.errors,
        });

        totalDaysAggregated += result.daysAggregated;
        totalErrors = totalErrors.concat(result.errors);

        console.log(`✅ API ${api.name} processada com sucesso`);
      } catch (error) {
        const errorMsg = `Erro ao processar API ${api.name} (${api.id}): ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        
        results.push({
          apiId: api.id,
          apiName: api.name,
          storeId: api.storeId,
          success: false,
          daysAggregated: 0,
          totalSales: 0,
          totalOrders: 0,
          uniqueCustomers: 0,
          errors: [errorMsg],
        });

        totalErrors.push(errorMsg);
      }
    }

    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? `Dados agregados com sucesso para ${apis.length} APIs`
        : `Dados agregados com alguns erros`,
      data: {
        apisProcessed: apis.length,
        totalDaysAggregated,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        results,
        errors: totalErrors,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao agregar dados de vendas:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message
      : String(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/saipos/aggregate?days=15
 * Agrega dados de vendas para todas as APIs ativas do usuário (método GET para facilitar testes)
 */
export async function GET(request: Request) {
  try {
    console.log("📊 [GET /api/saipos/aggregate] Iniciando agregação de dados...");

    // Autenticação
    const stackUser = await stackServerApp.getUser({ or: "return-null" });
    if (!stackUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail || undefined,
      displayName: stackUser.displayName || undefined,
      profileImageUrl: stackUser.profileImageUrl || undefined,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    });
    const userId = dbUser.id;

    // Ler parâmetros da URL
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "15", 10);

    // Calcular período
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    console.log(`📊 Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`);

    // Buscar todas as APIs do usuário
    const apis = await prisma.userAPI.findMany({
      where: {
        userId: userId,
        type: "saipos",
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        storeId: true,
      },
    });

    console.log(`📊 Encontradas ${apis.length} APIs ativas para agregar`);

    if (apis.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma API ativa encontrada para o usuário",
        data: {
          apisProcessed: 0,
          results: [],
        },
      });
    }

    // Agregar dados para todas as APIs
    const results = [];
    let totalDaysAggregated = 0;
    let totalErrors: string[] = [];

    for (const api of apis) {
      try {
        console.log(`📊 Processando API: ${api.name} (${api.id})`);

        const result = await aggregateSalesData(
          api.id,
          api.storeId,
          startDate,
          endDate
        );

        results.push({
          apiId: api.id,
          apiName: api.name,
          storeId: api.storeId,
          success: result.success,
          daysAggregated: result.daysAggregated,
          totalSales: result.totalSales,
          totalOrders: result.totalOrders,
          uniqueCustomers: result.uniqueCustomers,
          errors: result.errors,
        });

        totalDaysAggregated += result.daysAggregated;
        totalErrors = totalErrors.concat(result.errors);

        console.log(`✅ API ${api.name} processada com sucesso`);
      } catch (error) {
        const errorMsg = `Erro ao processar API ${api.name} (${api.id}): ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        
        results.push({
          apiId: api.id,
          apiName: api.name,
          storeId: api.storeId,
          success: false,
          daysAggregated: 0,
          totalSales: 0,
          totalOrders: 0,
          uniqueCustomers: 0,
          errors: [errorMsg],
        });

        totalErrors.push(errorMsg);
      }
    }

    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? `Dados agregados com sucesso para ${apis.length} APIs`
        : `Dados agregados com alguns erros`,
      data: {
        apisProcessed: apis.length,
        totalDaysAggregated,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
        results,
        errors: totalErrors,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao agregar dados de vendas:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message
      : String(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

