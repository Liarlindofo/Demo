export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const start = url.searchParams.get("data_inicial");
    const end = url.searchParams.get("data_final");
    const apiId = url.searchParams.get("apiId");

    if (!start || !end || !apiId) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    const saiposAPI = await db.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      return NextResponse.json({ error: "API Saipos não encontrada" }, { status: 404 });
    }

    const TOKEN = saiposAPI.apiKey;
    const STORE_ID = saiposAPI.name;

    if (!TOKEN) {
      return NextResponse.json({ error: "Token Saipos ausente" }, { status: 401 });
    }

    // Logs de verificação
    console.log("Saipos Token:", TOKEN ? "[PRESENTE]" : "[AUSENTE]");
    console.log("Store ID:", STORE_ID);
    console.log("API ID recebido:", apiId);

    const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${start}&p_filter_date_end=${end}&store_id=${STORE_ID}&limit=500`;

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
      cache: "no-store",
    });

    const raw = await response.json();

    const data = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.items)
      ? raw.items
      : [];

    return NextResponse.json({ data, meta: { status: response.status } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
