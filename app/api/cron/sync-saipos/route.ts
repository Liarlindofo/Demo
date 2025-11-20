import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeBRTWindow, syncSaiposForApi } from '@/lib/saipos/sync'

export const runtime = 'nodejs'

export async function GET() {
  // Cron: run daily 00:05 BRT (scheduled via vercel.json in UTC 03:05)
  const { start, end } = computeBRTWindow(15)

  const apis = await prisma.userAPI.findMany({
    where: { type: 'saipos', enabled: true },
    select: { id: true, storeId: true },
  })

  const results = []
  for (const api of apis) {
    // Filtrar apenas APIs com storeId válido
    if (!api.storeId) {
      console.warn(`⚠️ API ${api.id} não tem storeId, pulando...`);
      continue;
    }
    
    const res = await syncSaiposForApi({
      apiId: api.id,
      storeId: api.storeId,
      start,
      end,
    })
    results.push({ apiId: api.id, success: res.success, synced: res.synced, errors: res.errors })
  }

  return NextResponse.json({ ok: true, count: results.length, results })
}
