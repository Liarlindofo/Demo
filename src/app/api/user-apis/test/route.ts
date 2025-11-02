import { NextRequest, NextResponse } from 'next/server'
import { UserAPIService } from '@/lib/user-api-service'
import { stackServerApp } from '@/stack'
import { syncStackAuthUser } from '@/lib/stack-auth-sync'

// POST /api/user-apis/test - Testar conexão da API
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const stackUser = await stackServerApp.getUser({ or: 'return-null' })
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
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
      console.error('Erro ao sincronizar usuário no teste:', syncError)
      // Continuar mesmo se a sincronização falhar
    }

    const { searchParams } = new URL(request.url)
    const apiId = searchParams.get('id')

    if (!apiId) {
      return NextResponse.json(
        { error: 'ID da API é obrigatório' },
        { status: 400 }
      )
    }

    const api = await UserAPIService.testAndUpdateAPI(apiId)
    return NextResponse.json({ api })
  } catch (error: unknown) {
    console.error('Erro ao testar API:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    
    // Log mais detalhado para debug
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    
    // Se for erro de token inválido, retornar 401
    const status = message.includes('Token inválido') || message.includes('401') || message.includes('403') ? 401 : 500
    
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

