import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("data_inicial");
    const end = url.searchParams.get("data_final");

    if (!start || !end) {
      return NextResponse.json({ error: "Datas não enviadas" }, { status: 400 });
    }

    const STORE_ID = process.env.SAIPOS_STORE_ID;
    const TOKEN = process.env.SAIPOS_TOKEN; // <- precisa existir no .env

    if (!TOKEN) {
      console.error("❌ SAIPOS_TOKEN não encontrado no .env");
      return NextResponse.json({ error: "Token não configurado" }, { status: 500 });
    }

    const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${start}&p_filter_date_end=${end}&store_id=${STORE_ID}&limit=500`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${TOKEN}`, // <- ESSENCIAL
        Accept: "application/json",
      },
    });

    const raw = await response.json();

    const data = Array.isArray(raw) ? raw :
      Array.isArray(raw.data) ? raw.data :
      Array.isArray(raw.items) ? raw.items : [];

    return NextResponse.json({ data, meta: { status: response.status, url: apiUrl } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
