import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { syncStackAuthUser } from '@/lib/stack-auth-sync'
import { UserAPIService } from '@/lib/user-api-service'

// GET /api/saipos/debug - Ver JSON bruto retornado pela API da Saipos
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const stackUser = await stackServerApp.getUser({ or: 'return-null' })
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const apiId = searchParams.get('apiId')

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
        { error: 'API Saipos não encontrada ou não conectada' },
        { status: 404 }
      )
    }

    // Fazer requisição de teste para ver a estrutura dos dados
    const today = new Date().toISOString().split('T')[0]
    const startDateTime = `${today}T00:00:00`
    const endDateTime = `${today}T23:59:59`
    const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(startDateTime)}&p_filter_date_end=${encodeURIComponent(endDateTime)}&p_limit=5&p_offset=0`

    const token = targetApi.apiKey.trim().replace(/^Bearer\s+/i, '')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Erro desconhecido')
      return NextResponse.json(
        { 
          error: `Erro na API Saipos: ${response.status} ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Retornar estrutura detalhada para debug
    return NextResponse.json({
      rawData: data,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
      firstItemKeys: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [],
      hasDataKey: data && typeof data === 'object' && 'data' in data,
      dataKeyType: data && typeof data === 'object' && 'data' in data ? (Array.isArray((data as Record<string, unknown>).data) ? 'array' : typeof (data as Record<string, unknown>).data) : null,
    })
  } catch (error: unknown) {
    console.error('Erro ao fazer debug:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

