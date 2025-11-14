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

    const rows = await db.salesDaily.findMany({
      select: { 
        storeId: true,
        userId: true,
        date: true,
        totalOrders: true,
        totalSales: true,
      },
      where: { userId },
      orderBy: { date: "desc" },
      take: 100, // Limitar para não sobrecarregar
    });
    
    return NextResponse.json({ 
      success: true, 
      data: rows,
      count: rows.length 
    });
  } catch (e) {
    console.error("debug storeIds error:", e);
    return NextResponse.json({ 
      success: false, 
      error: String(e) 
    }, { status: 500 });
  }
}

