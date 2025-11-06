export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/dashboard/sales - Ler dados de vendas do cache local
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");
    const range = url.searchParams.get("range") || "30d"; // 1d, 7d, 30d, 90d

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
      case "30d":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
    }

    // Buscar dados do cache
    const salesData = await db.salesDaily.findMany({
      where: {
        storeId: storeId,
        date: {
          gte: startDate,
          lte: today,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Converter para formato esperado pela dashboard
    const formattedData = salesData.map((item) => ({
      date: item.date.toISOString().split("T")[0],
      totalSales: Number(item.totalSales),
      totalOrders: item.totalOrders,
      averageTicket: item.averageTicket ? Number(item.averageTicket) : 0,
      uniqueCustomers: item.uniqueCustomers || 0,
      channels: item.channels || null,
    }));

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
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



