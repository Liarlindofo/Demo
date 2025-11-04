import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { syncStackAuthUser } from '@/lib/stack-auth-sync'
import { UserAPIService } from '@/lib/user-api-service'

export async function GET(request: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser({ or: 'return-null' })
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const apiId = searchParams.get('apiId')
    const debugDate = searchParams.get('date') || '2025-11-02'; // Data que o usuário mencionou

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

    const startDateTime = `${debugDate}T00:00:00`
    const endDateTime = `${debugDate}T23:59:59`
    const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${encodeURIComponent(startDateTime)}&p_filter_date_end=${encodeURIComponent(endDateTime)}&p_limit=300&p_offset=0`

    const token = targetApi.apiKey.trim().replace(/^Bearer\s+/i, '')
    
    console.log('🔍 RAW DEBUG - Fazendo requisição para:', url)
    console.log('🔍 RAW DEBUG - Token (primeiros 10 chars):', token.substring(0, 10) + '...')
    
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
      console.error('❌ RAW DEBUG - Erro na API Saipos:', response.status, errorText)
      return NextResponse.json(
        { error: `Erro na API Saipos: ${response.status} ${response.statusText}`, rawError: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    console.log('✅ RAW DEBUG - Status:', response.status)
    console.log('✅ RAW DEBUG - Tipo de dados:', Array.isArray(data) ? 'array' : typeof data)
    console.log('✅ RAW DEBUG - Comprimento:', Array.isArray(data) ? data.length : 'N/A')
    
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0]
      console.log('✅ RAW DEBUG - Primeira venda completa:', JSON.stringify(firstItem, null, 2))
      console.log('✅ RAW DEBUG - Campos da primeira venda:', Object.keys(firstItem))
      console.log('✅ RAW DEBUG - Tipos dos campos:', Object.fromEntries(
        Object.entries(firstItem).map(([k, v]) => [k, typeof v])
      ))
      
      // Analisar estrutura de items se existir
      if (firstItem.items && Array.isArray(firstItem.items) && firstItem.items.length > 0) {
        console.log('✅ RAW DEBUG - Primeiro item da venda:', JSON.stringify(firstItem.items[0], null, 2))
      }
      
      // Analisar estrutura de customer se existir
      if (firstItem.customer) {
        console.log('✅ RAW DEBUG - Cliente:', JSON.stringify(firstItem.customer, null, 2))
      }
      
      // Analisar estrutura de payments se existir
      if (firstItem.payments && Array.isArray(firstItem.payments) && firstItem.payments.length > 0) {
        console.log('✅ RAW DEBUG - Primeiro pagamento:', JSON.stringify(firstItem.payments[0], null, 2))
      }
    }
    
    return NextResponse.json({
      message: 'Debug RAW da API Saipos - Veja o console do servidor para logs detalhados',
      requestInfo: {
        date: debugDate,
        apiId: targetApi.id,
        apiName: targetApi.name,
        endpoint: url,
      },
      responseInfo: {
        status: response.status,
        isArray: Array.isArray(data),
        itemCount: Array.isArray(data) ? data.length : 'N/A',
        firstItemKeys: Array.isArray(data) && data.length > 0 ? Object.keys(data[0] as Record<string, unknown>) : [],
      },
      rawData: data, // Retornar dados brutos completos
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      }
    })
  } catch (error: unknown) {
    console.error('❌ RAW DEBUG - Erro ao fazer debug:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

