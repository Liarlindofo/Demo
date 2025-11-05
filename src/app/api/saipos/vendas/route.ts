import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { syncStackAuthUser } from '@/lib/stack-auth-sync'
import { UserAPIService } from '@/lib/user-api-service'

// GET /api/saipos/vendas - Buscar dados de vendas da Saipos via proxy
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const stackUser = await stackServerApp.getUser({ or: 'return-null' })
    if (!stackUser) {
      return NextResponse.json(
        { data: [], meta: { status: 401, error: 'Não autenticado' } },
        { status: 401 }
      )
    }

    // Sincronizar usuário
    try {
      await syncStackAuthUser({
        id: stackUser.id,
        primaryEmail: stackUser.primaryEmail,
        displayName: stackUser.displayName,
        profileImageUrl: stackUser.profileImageUrl,
        primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
      })
    } catch (syncError) {
      console.error('Erro ao sincronizar usuário:', syncError)
    }

    const { searchParams } = new URL(request.url)
    const data_inicial = searchParams.get('data_inicial')
    const data_final = searchParams.get('data_final')
    const apiId = searchParams.get('apiId')
    const storeId = searchParams.get('storeId')

    if (!data_inicial || !data_final) {
      return NextResponse.json(
        { data: [], meta: { status: 400, error: 'data_inicial e data_final são obrigatórios' } },
        { status: 400 }
      )
    }

    // Buscar API do usuário
    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
      profileImageUrl: stackUser.profileImageUrl,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    })

    const apis = await UserAPIService.getUserAPIs(dbUser.id)
    const targetApi = apiId 
      ? apis.find(a => a.id === apiId && a.type === 'saipos' && a.status === 'connected')
      : apis.find(a => a.type === 'saipos' && a.status === 'connected')

    if (!targetApi || !targetApi.apiKey) {
      return NextResponse.json(
        { data: [], meta: { status: 404, error: 'API Saipos não encontrada ou não conectada' } },
        { status: 404 }
      )
    }

    // Construir URL única da Saipos Data API (sale_date + store_id + limit)
    const startDateTime = data_inicial.includes('T') ? data_inicial : `${data_inicial}T00:00:00`
    const endDateTime = data_final.includes('T') ? data_final : `${data_final}T23:59:59`
    if (!storeId) {
      return NextResponse.json(
        { data: [], meta: { status: 400, error: 'storeId é obrigatório' } },
        { status: 400 }
      )
    }

    const token = targetApi.apiKey.trim().replace(/^Bearer\s+/i, '')
    const start = encodeURIComponent(startDateTime)
    const end = encodeURIComponent(endDateTime)
    const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${start}&p_filter_date_end=${end}&store_id=${encodeURIComponent(storeId)}&limit=500`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const json = await response.json().catch(() => ([]))
    const data = Array.isArray(json) ? json : (json?.data ?? json?.items ?? [])

    return NextResponse.json(
      { data, meta: { status: response.status, url } },
      { status: response.ok ? 200 : response.status }
    )
  } catch (error: unknown) {
    console.error('Erro ao buscar dados de vendas:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { data: [], meta: { status: 502, error: message } },
      { status: 502 }
    )
  }
}

