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

    // Fazer requisição para a API da Saipos pelo servidor (sem CORS)
    // Implementar paginação para buscar TODAS as vendas
    // Se data_inicial e data_final já vierem com horas, usar diretamente
    // Caso contrário, adicionar horas padrão
    const startDateTime = data_inicial.includes('T') ? data_inicial : `${data_inicial}T00:00:00`
    const endDateTime = data_final.includes('T') ? data_final : `${data_final}T23:59:59`
    const token = targetApi.apiKey.trim().replace(/^Bearer\s+/i, '')
    
    const allSales: unknown[] = []
    let offset = 0
    const limit = 300
    let hasMoreData = true
    
    console.log('🔄 Iniciando busca paginada de vendas para:', data_inicial, 'até', data_final)
    
    let lastUrl = ''
    while (hasMoreData) {
      const storeIdQuery = storeId ? `&store_id=${encodeURIComponent(storeId)}` : ''
      const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=sale_date&p_filter_date_start=${encodeURIComponent(startDateTime)}&p_filter_date_end=${encodeURIComponent(endDateTime)}${storeIdQuery}&p_limit=${limit}&p_offset=${offset}`
      lastUrl = url
      
      console.log(`📥 Buscando vendas: offset=${offset}, limit=${limit}`)
      
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
        console.error('Erro na API Saipos:', response.status, errorText)
        return NextResponse.json(
          { data: [], meta: { status: response.status, url: lastUrl, error: response.statusText } },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      // Verificar se retornou dados
      if (!data || (Array.isArray(data) && data.length === 0)) {
        hasMoreData = false
        break
      }
      
      // Adicionar dados ao array total
      if (Array.isArray(data)) {
        allSales.push(...data)
        console.log(`✅ Página carregada: ${data.length} vendas (total: ${allSales.length})`)
        
        // Se retornou menos que o limite, não há mais páginas
        if (data.length < limit) {
          hasMoreData = false
        } else {
          offset += limit
        }
      } else {
        // Se não é array, retornar como está (pode ser erro ou estrutura diferente)
        console.log('⚠️ Resposta não é array, normalizando para envelope com data=[]')
        return NextResponse.json(
          { data: [], meta: { status: 200, url: lastUrl } },
          { status: 200 }
        )
      }
    }
    
    console.log(`📊 Total de vendas carregadas: ${allSales.length}`)
    
    // Log detalhado do que foi retornado da API
    console.log('📡 Resposta da API Saipos (vendas):', {
      status: 200,
      dataType: 'array',
      dataLength: allSales.length,
      firstItem: allSales.length > 0 ? allSales[0] : null,
      pages: Math.ceil(allSales.length / limit),
    })
    
    return NextResponse.json(
      { data: allSales, meta: { status: 200, url: lastUrl } },
      { status: 200 }
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

