import { NextRequest, NextResponse } from 'next/server'
import { computeBRTWindow, syncSaiposForApi } from '@/lib/saipos/sync'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const apiId = String(body.apiId ?? '').trim()
    const overrideStoreId = body.storeId ? String(body.storeId) : undefined
    const days = Number(body.days ?? 15)

    if (!apiId) {
      return NextResponse.json({ success: false, message: 'apiId é obrigatório' }, { status: 400 })
    }
    const { start, end } = computeBRTWindow(Number.isFinite(days) && days > 0 ? days : 15)

    const result = await syncSaiposForApi({
      apiId,
      storeId: overrideStoreId,
      start,
      end,
      initialLoad: false,
    })

    return NextResponse.json(result, { status: result.success ? 200 : 409 })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Erro inesperado' },
      { status: 500 },
    )
  }
}
