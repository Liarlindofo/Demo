import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiId = String(body.apiId ?? "").trim();
    const days = Number(body.days ?? 15);
    // storeId é ignorado aqui porque a rota /api/saipos/sync usa o storeId da própria API

    if (!apiId) {
      return NextResponse.json(
        { success: false, error: "apiId é obrigatório" },
        { status: 400 }
      );
    }

    // Descobrir baseUrl atual a partir da requisição
    const origin =
      req.nextUrl?.origin ||
      (process.env.NODE_ENV === "production"
        ? "https://platefull.com.br"
        : "http://localhost:3000");

    const res = await fetch(`${origin}/api/saipos/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiId,
        days,
      }),
    });

    const json = await res.json().catch(() => ({
      success: false,
      error: `Erro ao parsear resposta da sincronização (status ${res.status})`,
    }));

    return NextResponse.json(json, { status: res.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erro interno";
    console.error("❌ Erro em /api/saipos/sync-manual:", e);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}