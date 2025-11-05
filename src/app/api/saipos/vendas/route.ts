export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const start = url.searchParams.get("data_inicial");
    const end = url.searchParams.get("data_final");
    const apiId = url.searchParams.get("apiId");
    const storeIdParam = url.searchParams.get("storeId"); // Fallback: aceitar storeId via query

    if (!start || !end || !apiId) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    const saiposAPI = await db.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      return NextResponse.json({ error: "API Saipos não encontrada" }, { status: 404 });
    }

    const apiKey = saiposAPI.apiKey;
    // Usar storeId do query param se fornecido, senão usar o name da API
    const storeId = storeIdParam || saiposAPI.name;

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 401 });
    }

    if (!storeId) {
      return NextResponse.json({ error: "Store ID não encontrado. Configure o storeId na API ou envie via query param." }, { status: 400 });
    }

    // Limpar e preparar o token (remover espaços e "Bearer " se já existir)
    const cleanToken = apiKey.trim().replace(/^Bearer\s+/i, '');

    if (!cleanToken) {
      return NextResponse.json({ error: "API key is empty after cleaning" }, { status: 401 });
    }

    // Logs de verificação
    console.log("=== DEBUG SAIPOS API ===");
    console.log("API ID recebido:", apiId);
    console.log("Store ID:", storeId);
    console.log("Token presente:", cleanToken ? "SIM" : "NÃO");
    console.log("Token preview:", cleanToken.substring(0, 20) + "...");

    const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${encodeURIComponent(start)}&p_filter_date_end=${encodeURIComponent(end)}&p_store_id=${encodeURIComponent(storeId)}&limit=500`;
    
    console.log("URL da API:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanToken}`,
      },
      cache: "no-store",
    });

    console.log("Status da resposta:", response.status);
    console.log("Status OK?", response.ok);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido');
      console.error("=== ERRO DA API SAIPOS ===");
      console.error("Status:", response.status);
      console.error("Status Text:", response.statusText);
      console.error("Resposta:", errorText);
      return NextResponse.json(
        { 
          data: [], 
          meta: { 
            status: response.status, 
            error: errorText,
            url: apiUrl 
          } 
        },
        { status: response.status }
      );
    }

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
