export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stackServerApp } from "@/stack";
import { syncStackAuthUser } from "@/lib/stack-auth-sync";

// GET /api/debug/storeIds - Retorna dados de debug para storeIds
export async function GET() {
  try {
    const stackUser = await stackServerApp.getUser({ or: "return-null" });
    if (!stackUser) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail || undefined,
      displayName: stackUser.displayName || undefined,
      profileImageUrl: stackUser.profileImageUrl || undefined,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    });
    const userId = dbUser.id;

    // Buscar todas as APIs do usuário
    const apis = await db.userAPI.findMany({
      where: { userId, type: "saipos" },
      select: {
        id: true,
        userId: true,
        storeId: true,
        name: true,
      },
    });

    // Buscar registros de sales_daily usando apiId das APIs do usuário
    const apiIds = apis.map(a => a.id);
    
    const rows = apiIds.length > 0
      ? await db.salesDaily.findMany({
          where: { apiId: { in: apiIds } },
          select: {
            id: true,
            apiId: true,
            storeId: true,
            date: true,
            totalOrders: true,
            totalSales: true,
          },
          orderBy: { date: "desc" },
          take: 20,
        })
      : [];
    
    return NextResponse.json({ 
      success: true, 
      salesDaily: rows.map(r => ({
        id: r.id,
        apiId: r.apiId,
        storeId: r.storeId,
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date,
        totalOrders: r.totalOrders,
        totalSales: r.totalSales ? Number(r.totalSales) : 0,
      })),
      apis,
      summary: {
        totalSalesRecords: rows.length,
        totalApis: apis.length,
        salesWithApiId: rows.filter(r => r.apiId).length,
        salesWithoutApiId: rows.filter(r => !r.apiId).length,
      }
    });
  } catch (e) {
    console.error("debug storeIds error:", e);
    return NextResponse.json({ 
      success: false, 
      error: String(e) 
    }, { status: 500 });
  }
}
