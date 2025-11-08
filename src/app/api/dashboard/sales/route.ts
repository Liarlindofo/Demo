export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/dashboard/sales - Ler dados de vendas do cache local
export async function GET(request: Request) {
  try {
    console.log("📊 [GET /api/dashboard/sales] Iniciando busca de dados...");
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");
    const range = url.searchParams.get("range") || "7d"; // 1d, 7d, 15d (máximo)

    console.log("📊 Parâmetros recebidos:", { storeId, range });

    if (!storeId) {
      console.error("❌ storeId não fornecido");
      return NextResponse.json(
        { error: "storeId é obrigatório" },
        { status: 400 }
      );
    }

    // Calcular datas baseado no range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date;
    switch (range) {
      case "1d":
        startDate = new Date(today);
        break;
      case "7d":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "15d":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 15);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
    }

    // Buscar dados do cache com otimização
    // Usar select apenas dos campos necessários para melhor performance
    console.log("📊 Buscando dados do banco...", { storeId, startDate, today, range });
    
    // Verificar se o modelo existe
    if (!db.salesDaily) {
      console.error("❌ Modelo salesDaily não encontrado no Prisma Client");
      throw new Error("Modelo salesDaily não está disponível. Execute 'npx prisma generate' para regenerar o Prisma Client.");
    }
    
    // Verificar se há dados no banco para este storeId
    let totalRecords = 0;
    let allRecords: any[] = [];
    
    try {
      totalRecords = await db.salesDaily.count({
        where: { storeId: storeId },
      });
      console.log(`📊 Total de registros no banco para storeId "${storeId}": ${totalRecords}`);
      
      // Buscar todos os registros para debug
      allRecords = await db.salesDaily.findMany({
        where: { storeId: storeId },
        select: { date: true, totalSales: true, totalOrders: true },
        take: 5,
        orderBy: { date: "desc" },
      });
      console.log(`📊 Últimos 5 registros encontrados:`, allRecords);
    } catch (countError) {
      console.error("❌ Erro ao contar registros:", countError);
      // Continuar mesmo com erro - pode ser que a tabela não exista ainda
      totalRecords = 0;
    }
    
    let salesData;
    try {
      salesData = await db.salesDaily.findMany({
        where: {
          storeId: storeId,
          date: {
            gte: startDate,
            lte: today,
          },
        },
        select: {
          date: true,
          totalSales: true,
          totalOrders: true,
          averageTicket: true,
          uniqueCustomers: true,
          channels: true,
        },
        orderBy: {
          date: "asc",
        },
        // Limitar resultados para períodos maiores
        take: range === "15d" ? 15 : undefined,
      });
      console.log(`📊 Dados encontrados no período: ${salesData.length} registros`);
      if (salesData.length > 0) {
        console.log(`📊 Primeiro registro:`, {
          date: salesData[0].date,
          totalSales: salesData[0].totalSales,
          totalOrders: salesData[0].totalOrders,
        });
      }
    } catch (dbError) {
      console.error("❌ Erro ao buscar dados do banco:", dbError);
      throw dbError;
    }

    // Converter para formato esperado pela dashboard
    console.log("📊 Convertendo dados...");
    const formattedData = salesData.map((item, index) => {
      try {
        // Converter data para string ISO (YYYY-MM-DD)
        let dateStr: string;
        if (item.date instanceof Date) {
          dateStr = item.date.toISOString().split("T")[0];
        } else {
          // Se já for string, usar diretamente
          dateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split("T")[0];
        }
        
        // Converter Decimal para Number - método mais robusto
        let totalSalesNum: number = 0;
        try {
          if (item.totalSales !== null && item.totalSales !== undefined) {
            // Verificar se é Prisma.Decimal
            if (item.totalSales && typeof item.totalSales === 'object' && 'toNumber' in item.totalSales) {
              totalSalesNum = (item.totalSales as Prisma.Decimal).toNumber();
            } else if (typeof item.totalSales === 'string') {
              totalSalesNum = parseFloat(item.totalSales) || 0;
            } else if (typeof item.totalSales === 'number') {
              totalSalesNum = item.totalSales;
            } else {
              totalSalesNum = Number(item.totalSales) || 0;
            }
          }
        } catch (e) {
          console.error(`Erro ao converter totalSales no item ${index}:`, e, item.totalSales);
          totalSalesNum = 0;
        }
        
        // Converter averageTicket (pode ser null)
        let averageTicketNum: number = 0;
        try {
          if (item.averageTicket !== null && item.averageTicket !== undefined) {
            // Verificar se é Prisma.Decimal
            if (item.averageTicket && typeof item.averageTicket === 'object' && 'toNumber' in item.averageTicket) {
              averageTicketNum = (item.averageTicket as Prisma.Decimal).toNumber();
            } else if (typeof item.averageTicket === 'string') {
              averageTicketNum = parseFloat(item.averageTicket) || 0;
            } else if (typeof item.averageTicket === 'number') {
              averageTicketNum = item.averageTicket;
            } else {
              averageTicketNum = Number(item.averageTicket) || 0;
            }
          }
        } catch (e) {
          console.error(`Erro ao converter averageTicket no item ${index}:`, e, item.averageTicket);
          averageTicketNum = 0;
        }
        
        return {
          date: dateStr,
          totalSales: totalSalesNum,
          totalOrders: item.totalOrders || 0,
          averageTicket: averageTicketNum,
          uniqueCustomers: item.uniqueCustomers || 0,
          channels: item.channels || null,
        };
      } catch (error) {
        console.error(`❌ Erro ao converter item ${index}:`, error, item);
        // Retornar item com valores padrão em caso de erro
        const dateStr = item.date instanceof Date 
          ? item.date.toISOString().split("T")[0]
          : (typeof item.date === 'string' ? item.date : new Date().toISOString().split("T")[0]);
        
        return {
          date: dateStr,
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          uniqueCustomers: 0,
          channels: null,
        };
      }
    });

    // Calcular totais agregados
    const totals = formattedData.reduce(
      (acc, item) => ({
        totalSales: acc.totalSales + item.totalSales,
        totalOrders: acc.totalOrders + item.totalOrders,
        uniqueCustomers: acc.uniqueCustomers + item.uniqueCustomers,
      }),
      { totalSales: 0, totalOrders: 0, uniqueCustomers: 0 }
    );

    const averageTicket =
      totals.totalOrders > 0 ? totals.totalSales / totals.totalOrders : 0;

    console.log("📊 Dados formatados com sucesso:", {
      totalItems: formattedData.length,
      totals,
      averageTicket,
    });

    return NextResponse.json({
      data: formattedData,
      summary: {
        totalSales: totals.totalSales,
        totalOrders: totals.totalOrders,
        averageTicket: averageTicket,
        uniqueCustomers: totals.uniqueCustomers,
      },
      period: {
        start: startDate.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
        range: range,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar dados de vendas:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");
    console.error("Tipo do erro:", error?.constructor?.name);
    console.error("Mensagem do erro:", error instanceof Error ? error.message : String(error));
    
    // Retornar erro mais detalhado
    const errorMessage = error instanceof Error 
      ? error.message
      : String(error);
    
    // Em produção, não expor stack trace completo
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorDetails = isDevelopment && error instanceof Error && error.stack
      ? `\n${error.stack}`
      : '';
    
    return NextResponse.json(
      {
        error: `${errorMessage}${errorDetails}`,
        data: [],
        summary: {
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          uniqueCustomers: 0,
        },
      },
      { status: 500 }
    );
  }
}




