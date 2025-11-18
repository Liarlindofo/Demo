import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { aggregateSalesData } from '@/lib/sales-aggregation'

type SyncParams = {
  apiId: string
  storeId?: string | null
  start: Date
  end: Date
}

type SyncSummary = {
  success: boolean
  synced: number
  errors: number
  totalBeforeFilter: number
  totalAfterFilter: number
  totalRequests: number
  period: { start: string; end: string }
  lastUrl?: string
  started_at: string
  ended_at: string
  message?: string
}

// Tipo para registros de venda da Saipos (estrutura flexível)
type SaiposSaleRecord = {
  id_sale?: string | number | null
  id?: string | number | null
  numero?: string | number | null
  number?: string | number | null
  shift_date?: string | null
  sale_date?: string | null
  created_at?: string | null
  date?: string | null
  opened_at?: string | null
  total?: string | number | null
  total_amount?: string | number | null
  valor_total?: string | number | null
  amount?: string | number | null
  [key: string]: unknown
}

const BRT_OFFSET = '-03:00'
const DEFAULT_LIMIT = 200
const MAX_TOTAL_REQUESTS = 100
const CONSECUTIVE_EMPTY_LIMIT = 5
const DELAY_BETWEEN_REQUESTS_MS = Number(process.env.SAIPOS_DELAY_MS ?? 800)

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toISODateOnly(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseTotalAmount(record: SaiposSaleRecord): number | null {
  const candidates = [
    record?.total,
    record?.total_amount,
    record?.valor_total,
    record?.amount,
  ]
  for (const c of candidates) {
    if (c === undefined || c === null) continue
    const num = typeof c === 'string' ? Number(c.replace(',', '.')) : Number(c)
    if (Number.isFinite(num)) {
      return Number(num.toFixed(2))
    }
  }
  return null
}

function extractSaleDate(record: SaiposSaleRecord): string | undefined {
  const candidates = [
    record?.shift_date,
    record?.sale_date,
    record?.created_at,
    record?.date,
    record?.opened_at,
  ]
  for (const candidate of candidates) {
    if (candidate != null && typeof candidate === 'string') {
      return candidate
    }
  }
  return undefined
}

function extractExternalId(record: SaiposSaleRecord, fallbackStoreId?: string | null): string | null {
  const primary = record?.id_sale || record?.id
  if (primary) return String(primary)
  const numero = record?.numero ?? record?.number
  if (numero && fallbackStoreId) return `${fallbackStoreId}:${numero}`
  return null
}

function looksMockedPage(items: SaiposSaleRecord[]): boolean {
  if (items.length === 0) return false
  
  // Verificar se todos os itens têm IDs válidos
  const itemsWithIds = items.filter((r) => extractExternalId(r, 'store'))
  // Se menos de 50% dos itens têm IDs, pode ser mockado
  if (itemsWithIds.length < items.length * 0.5) {
    console.warn(`⚠️ Menos de 50% dos itens têm IDs válidos (${itemsWithIds.length}/${items.length})`)
    // Não bloquear, apenas avisar - pode ser dados reais com estrutura diferente
  }
  
  // Verificar se todos os objetos são muito pequenos (menos de 3 campos)
  const tiny = items.every((r) => r && typeof r === 'object' && Object.keys(r).length <= 2)
  if (tiny && items.length > 5) {
    // Se todos têm 2 campos ou menos E há mais de 5 itens, provavelmente é mockado
    return true
  }
  
  // Verificar se todos são idênticos (apenas se houver mais de 1 item)
  if (items.length > 1) {
    const first = JSON.stringify(items[0])
    const allSame = items.every((r) => JSON.stringify(r) === first)
    if (allSame) {
      console.warn(`⚠️ Todos os ${items.length} itens são idênticos - possível dado mockado`)
      return true
    }
  }
  
  return false
}

async function fetchWithRetry(url: string, token: string, attempt = 1): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After')) || 0
    const backoff = Math.max(retryAfter * 1000, Math.pow(2, attempt) * 1000 * 2)
    if (attempt <= 3) {
      await sleep(backoff)
      return fetchWithRetry(url, token, attempt + 1)
    }
  }
  if (!res.ok && attempt <= 3) {
    const backoff = Math.pow(2, attempt) * 1000 * 2
    await sleep(backoff)
    return fetchWithRetry(url, token, attempt + 1)
  }
  return res
}

function buildSaiposUrl(params: {
  startISO: string
  endISO: string
  limit: number
  offset: number
  storeId: string
}) {
  const base = 'https://data.saipos.io/v1/search_sales'
  const q = new URLSearchParams()
  q.set('p_date_column_filter', 'shift_date')
  q.set('p_filter_date_start', params.startISO)
  q.set('p_filter_date_end', params.endISO)
  q.set('p_limit', String(params.limit))
  q.set('p_offset', String(params.offset))
  q.set('store_id', String(params.storeId))
  return `${base}?${q.toString()}`
}

export async function syncSaiposForApi({
  apiId,
  storeId,
  start,
  end,
}: SyncParams): Promise<SyncSummary> {
  console.log(`🔄 Iniciando syncSaiposForApi para apiId=${apiId}, storeId=${storeId || 'não fornecido'}`)
  
  // Acquire lock (optimistic set isSyncing = true if currently false)
  const acquired = await prisma.userAPI.updateMany({
    where: { id: apiId, isSyncing: false },
    data: { isSyncing: true },
  })
  if (acquired.count === 0) {
    return {
      success: false,
      synced: 0,
      errors: 0,
      totalBeforeFilter: 0,
      totalAfterFilter: 0,
      totalRequests: 0,
      period: { start: start.toISOString(), end: end.toISOString() },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      message: 'Já existe sincronização em andamento para esta loja (lock ativo).',
    }
  }

  const api = await prisma.userAPI.findUnique({
    where: { id: apiId },
    select: {
      id: true,
      userId: true,
      type: true,
      apiKey: true,
      storeId: true,
      enabled: true,
      name: true,
    },
  })
  
  if (!api) {
    await prisma.userAPI.update({ where: { id: apiId }, data: { isSyncing: false } }).catch(() => {})
    return {
      success: false,
      synced: 0,
      errors: 0,
      totalBeforeFilter: 0,
      totalAfterFilter: 0,
      totalRequests: 0,
      period: { start: start.toISOString(), end: end.toISOString() },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      message: `API não encontrada com ID: ${apiId}`,
    }
  }
  
  if (api.type !== 'saipos') {
    await prisma.userAPI.update({ where: { id: apiId }, data: { isSyncing: false } }).catch(() => {})
    return {
      success: false,
      synced: 0,
      errors: 0,
      totalBeforeFilter: 0,
      totalAfterFilter: 0,
      totalRequests: 0,
      period: { start: start.toISOString(), end: end.toISOString() },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      message: `API não é do tipo Saipos. Tipo atual: ${api.type || 'não definido'}`,
    }
  }
  
  // Permitir sincronização mesmo se enabled=false (pode ser sincronização manual)
  // Mas avisar se estiver desativada
  console.log(`✅ API encontrada: id=${api.id}, type=${api.type}, enabled=${api.enabled}, storeId=${api.storeId || 'não definido'}, name=${api.name || 'não definido'}`)
  
  if (api.enabled === false) {
    console.warn(`⚠️ API ${apiId} (${api.name}) está desativada, mas prosseguindo com sincronização manual`)
  }

  const effectiveStoreId = storeId ?? api.storeId ?? ''
  if (!effectiveStoreId) {
    await prisma.userAPI.update({ where: { id: apiId }, data: { isSyncing: false } })
    return {
      success: false,
      synced: 0,
      errors: 0,
      totalBeforeFilter: 0,
      totalAfterFilter: 0,
      totalRequests: 0,
      period: { start: start.toISOString(), end: end.toISOString() },
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      message: 'storeId não configurado para esta integração.',
    }
  }

  const token = (api.apiKey ?? '').trim().replace(/^Bearer\s+/i, '')
  const tokenLogPrefix = token.substring(0, 8)

  const run = await prisma.syncRun.create({
    data: {
      userApiId: api.id,
      storeId: effectiveStoreId,
      status: 'running',
      startPeriod: start,
      endPeriod: end,
      startedAt: new Date(),
    },
  })

  let lastUrl: string | undefined
  let totalRequests = 0
  let totalRecordsRaw = 0
  let totalAfterFilter = 0
  let synced = 0
  let errors = 0
  let consecutiveEmptyPages = 0

  try {
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    // Derive local date strings for final filter
    const startLocalDateString = toISODateOnly(start)
    const endLocalDateString = toISODateOnly(end)

    for (let offset = 0; offset < DEFAULT_LIMIT * MAX_TOTAL_REQUESTS; offset += DEFAULT_LIMIT) {
      if (totalRequests >= MAX_TOTAL_REQUESTS) break

      const url = buildSaiposUrl({
        startISO,
        endISO,
        limit: DEFAULT_LIMIT,
        offset,
        storeId: effectiveStoreId,
      })
      lastUrl = url
      totalRequests += 1

      const res = await fetchWithRetry(url, token)
      if (!res.ok) {
        errors += 1
        const payloadPreview = await res.text().catch(() => '')
        await prisma.syncError.create({
          data: {
            syncRunId: run.id,
            message: `HTTP ${res.status} em ${url}`,
            payloadPreview: payloadPreview.slice(0, 500),
          },
        })
        if (res.status >= 500) {
          throw new Error(`Erro irreversível da API Saipos: ${res.status}`)
        }
      }

      let json: unknown
      try {
        json = await res.json()
      } catch (e: unknown) {
        errors += 1
        await prisma.syncError.create({
          data: {
            syncRunId: run.id,
            message: 'Falha ao parsear JSON',
            payloadPreview: undefined,
          },
        })
        throw e
      }

      // save raw page
      await prisma.salesRawPage.create({
        data: { syncRunId: run.id, pageIndex: offset / DEFAULT_LIMIT, payload: json as Prisma.JsonObject },
      })

      // extract items flexibly
      let items: SaiposSaleRecord[] = []
      if (Array.isArray(json)) {
        items = json as SaiposSaleRecord[]
      } else if (json && typeof json === 'object' && 'data' in json && Array.isArray(json.data)) {
        items = json.data as SaiposSaleRecord[]
      } else if (json && typeof json === 'object' && 'items' in json && Array.isArray(json.items)) {
        items = json.items as SaiposSaleRecord[]
      }

      const pageCount = items.length
      totalRecordsRaw += pageCount

      if (pageCount === 0) {
        consecutiveEmptyPages += 1
        if (consecutiveEmptyPages >= CONSECUTIVE_EMPTY_LIMIT) break
        await sleep(DELAY_BETWEEN_REQUESTS_MS)
        continue
      } else {
        consecutiveEmptyPages = 0
      }

      if (looksMockedPage(items)) {
        errors += 1
        const preview = items.length > 0 ? JSON.stringify(items[0]).slice(0, 500) : 'array vazio'
        await prisma.syncError.create({
          data: {
            syncRunId: run.id,
            message: 'Página aparenta conter dados mockados (todos idênticos ou muito pequenos); pulando página.',
            payloadPreview: preview,
          },
        })
        console.warn(`⚠️ Página ${offset / DEFAULT_LIMIT} aparenta conter dados mockados, pulando...`)
        // Não abortar a sincronização, apenas pular esta página
        await sleep(DELAY_BETWEEN_REQUESTS_MS)
        continue
      }

      // filter by date window using sale date fields; also prepare upserts
      const filtered = items.filter((r) => {
        const saleDateStr = extractSaleDate(r)
        if (!saleDateStr) return false
        const iso = new Date(saleDateStr).toISOString()
        const dateOnly = iso.split('T')[0]
        return dateOnly >= startLocalDateString && dateOnly <= endLocalDateString
      })

      totalAfterFilter += filtered.length

      const upserts = filtered
        .map((r) => {
          const externalId = extractExternalId(r, effectiveStoreId)
          const saleDateStr = extractSaleDate(r)
          if (!externalId || !saleDateStr) {
            return null
          }
          const saleDateUtc = new Date(saleDateStr).toISOString()
          const totalAmount = parseTotalAmount(r)
          const unique = { storeId: effectiveStoreId, externalId }
          return prisma.sale.upsert({
            where: { storeId_externalId: unique },
            create: {
              externalId,
              storeId: effectiveStoreId,
              userId: api.userId,
              saleDateUtc: new Date(saleDateUtc),
              totalAmount,
              rawJson: r as unknown as Prisma.JsonObject,
            },
            update: {
              saleDateUtc: new Date(saleDateUtc),
              totalAmount,
              rawJson: r as unknown as Prisma.JsonObject,
              updatedAt: new Date(),
            },
          })
        })
        .filter(Boolean) as ReturnType<typeof prisma.sale.upsert>[]

      if (upserts.length > 0) {
        await prisma.$transaction(upserts)
        synced += upserts.length
        console.log(`✅ ${upserts.length} vendas individuais salvas na tabela 'sales' (página ${offset / DEFAULT_LIMIT + 1})`)
        
        // Log de amostra dos primeiros 3 registros para validação
        if (synced <= 3) {
          const sample = filtered.slice(0, 3).map((r) => ({
            externalId: extractExternalId(r, effectiveStoreId),
            saleDate: extractSaleDate(r),
            total: parseTotalAmount(r)?.toString(),
          }))
          console.log(`📊 Amostra de dados salvos:`, sample)
        }
      }

      await prisma.syncRun.update({
        where: { id: run.id },
        data: {
          lastUrl,
          totalRequests,
          totalRecordsRaw,
          totalAfterFilter,
          syncedCount: synced,
          errorsCount: errors,
        },
      })

      await sleep(DELAY_BETWEEN_REQUESTS_MS)
    }

    const ended = new Date()
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: 'success',
        endedAt: ended,
        lastUrl,
        totalRequests,
        totalRecordsRaw,
        totalAfterFilter,
        syncedCount: synced,
        errorsCount: errors,
      },
    })

    // Agregar dados após sincronização bem-sucedida
    console.log('📊 Iniciando agregação de dados após sincronização...')
    try {
      const aggregationResult = await aggregateSalesData(
        apiId,
        effectiveStoreId,
        start,
        end
      )
      
      console.log('✅ Agregação concluída:', aggregationResult)
      
      if (!aggregationResult.success) {
        console.warn('⚠️ Agregação teve erros:', aggregationResult.errors)
      }
    } catch (aggregationError) {
      console.error('❌ Erro na agregação (não fatal):', aggregationError)
      // Não falhar a sincronização por causa de erro na agregação
    }

    return {
      success: true,
      synced,
      errors,
      totalBeforeFilter: totalRecordsRaw,
      totalAfterFilter,
      totalRequests,
      period: { start: start.toISOString(), end: end.toISOString() },
      lastUrl,
      started_at: run.startedAt.toISOString(),
      ended_at: ended.toISOString(),
    }
  } catch (e: unknown) {
    const ended = new Date()
    const errorMessage = e instanceof Error ? e.message : 'Erro na sincronização'
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: 'error',
        endedAt: ended,
        lastUrl,
        totalRequests,
        totalRecordsRaw,
        totalAfterFilter,
        syncedCount: synced,
        errorsCount: errors,
      },
    })
    return {
      success: false,
      synced,
      errors,
      totalBeforeFilter: totalRecordsRaw,
      totalAfterFilter,
      totalRequests,
      period: { start: start.toISOString(), end: end.toISOString() },
      lastUrl,
      started_at: run.startedAt.toISOString(),
      ended_at: ended.toISOString(),
      message: errorMessage,
    }
  } finally {
    await prisma.userAPI.update({ where: { id: apiId }, data: { isSyncing: false } })
    console.log(`[saipos-sync] done api=${apiId} token=${tokenLogPrefix}... lastUrl=${lastUrl}`)
  }
}

export function computeBRTWindow(days = 15): { start: Date; end: Date } {
  // Get today in America/Sao_Paulo, then build -03:00 strings for 00:00 and 23:59:59
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const now = new Date()

  const toYmd = (d: Date) => {
    const parts = fmt.formatToParts(d)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const da = parts.find((p) => p.type === 'day')?.value
    return `${y}-${m}-${da}`
  }

  const endLocalYmd = toYmd(now)
  const startRef = new Date(now)
  startRef.setDate(startRef.getDate() - (days - 1))
  const startLocalYmd = toYmd(startRef)

  const startDate = new Date(`${startLocalYmd}T00:00:00${BRT_OFFSET}`)
  const endDate = new Date(`${endLocalYmd}T23:59:59${BRT_OFFSET}`)
  return { start: startDate, end: endDate }
}


