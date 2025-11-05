import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const start = url.searchParams.get("data_inicial");
    const end = url.searchParams.get("data_final");
    const apiId = url.searchParams.get("apiId"); // ← vem do front, representa a loja

    if (!start || !end || !apiId) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    // 🔥 Busca o token da Saipos da loja certa
    const saiposAPI = await prisma.userAPI.findUnique({
      where: { id: apiId },
    });

    if (!saiposAPI || saiposAPI.type !== "saipos") {
      return NextResponse.json({ error: "API da Saipos não encontrada" }, { status: 404 });
    }

    const TOKEN = saiposAPI.apiKey; // ✅ aqui está o token correto
    const STORE_ID = saiposAPI.name || saiposAPI.baseUrl || ""; // precisamos confirmar qual campo guarda o storeId

    // Se o STORE_ID estiver salvo no name, OK.
    // Se estiver no baseUrl, só trocar a linha acima por:
    // const STORE_ID = saiposAPI.baseUrl || "";

    const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${start}&p_filter_date_end=${end}&store_id=${STORE_ID}&limit=500`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      },
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

    return NextResponse.json({ data, meta: { status: response.status, url: apiUrl } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
