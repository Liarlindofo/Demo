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

    // Retornar os 20 últimos registros de salesDaily para inspeção
    const rows = await db.salesDaily.findMany({
      select: {
        userId: true,
        storeId: true,
        date: true,
        totalOrders: true,
        totalSales: true,
      },
      orderBy: { date: "desc" },
      take: 20,
    });

    // Também retornar as APIs para comparação
    const apis = await db.userAPI.findMany({
      where: { type: "saipos" },
      select: {
        id: true,
        userId: true,
        storeId: true,
        name: true,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      salesDaily: rows,
      apis,
      summary: {
        totalSalesRecords: rows.length,
        totalApis: apis.length,
        salesWithUserId: rows.filter(r => r.userId).length,
        salesWithoutUserId: rows.filter(r => !r.userId).length,
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

