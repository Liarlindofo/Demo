export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard/sales - Ler dados de vendas do cache local
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");
    const range = url.searchParams.get("range") || "7d"; // 1d, 7d, 15d (máximo)

    if (!storeId) {
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
    const salesData = await db.salesDaily.findMany({
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

    // Converter para formato esperado pela dashboard
    const formattedData = salesData.map((item) => {
      try {
        // Converter data para string ISO (YYYY-MM-DD)
        let dateStr: string;
        if (item.date instanceof Date) {
          dateStr = item.date.toISOString().split("T")[0];
        } else {
          // Se já for string, usar diretamente
          dateStr = typeof item.date === 'string' ? item.date : new Date(item.date).toISOString().split("T")[0];
        }
        
        // Converter Decimal para Number
        let totalSalesNum: number;
        if (typeof item.totalSales === 'object' && item.totalSales !== null && 'toNumber' in item.totalSales) {
          totalSalesNum = (item.totalSales as any).toNumber();
        } else if (typeof item.totalSales === 'string') {
          totalSalesNum = parseFloat(item.totalSales);
        } else {
          totalSalesNum = Number(item.totalSales) || 0;
        }
        
        // Converter averageTicket (pode ser null)
        let averageTicketNum: number = 0;
        if (item.averageTicket !== null && item.averageTicket !== undefined) {
          if (typeof item.averageTicket === 'object' && 'toNumber' in item.averageTicket) {
            averageTicketNum = (item.averageTicket as any).toNumber();
          } else if (typeof item.averageTicket === 'string') {
            averageTicketNum = parseFloat(item.averageTicket);
          } else {
            averageTicketNum = Number(item.averageTicket) || 0;
          }
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
        console.error('Erro ao converter item:', error, item);
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
    
    // Retornar erro mais detalhado em desenvolvimento
    const errorMessage = error instanceof Error 
      ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
      : String(error);
    
    return NextResponse.json(
      {
        error: errorMessage,
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




