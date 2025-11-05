import { NextResponse } from "next/server";

const TOKEN = process.env.SAIPOS_TOKEN;
const STORE_ID = process.env.SAIPOS_STORE_ID; // <-- coloque o ID real da loja aqui

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("data_inicial");
    const end = url.searchParams.get("data_final");

    if (!start || !end) {
      return NextResponse.json({ error: "Datas não enviadas" }, { status: 400 });
    }

    // ✅ Endpoint correto do Data API
    const apiUrl = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${start}&p_filter_date_end=${end}&store_id=${STORE_ID}&limit=500`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json",
      }
    });

    const raw = await response.json();

    // ✅ Normaliza resposta independente da estrutura recebida
    const data =
      Array.isArray(raw) ? raw :
      Array.isArray(raw.data) ? raw.data :
      Array.isArray(raw.items) ? raw.items :
      [];

    return NextResponse.json({ data, meta: { status: response.status, url: apiUrl } });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { data: [], meta: { status: 500, error: message }},
      { status: 500 }
    );
  }
}
