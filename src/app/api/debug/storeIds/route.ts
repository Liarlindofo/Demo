export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/debug/storeIds - Retorna todos os storeIds distintos no banco
export async function GET() {
  try {
    const rows = await db.salesDaily.findMany({
      select: { storeId: true },
      distinct: ["storeId"],
    });
    
    return NextResponse.json({ 
      success: true, 
      storeIds: rows.map(r => r.storeId),
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

