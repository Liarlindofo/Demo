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
    })

    // Retornar 200 mesmo em caso de erro, mas com success: false
    // O frontend pode tratar baseado no campo success
    // 409 apenas para conflito de lock
    const status = result.success 
      ? 200 
      : result.message?.includes('lock') || result.message?.includes('em andamento')
        ? 409
        : 200
    
    return NextResponse.json(result, { status })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro inesperado'
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    )
  }
}
