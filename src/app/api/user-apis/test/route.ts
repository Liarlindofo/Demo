import { NextRequest, NextResponse } from 'next/server'
import { UserAPIService } from '@/lib/user-api-service'

// POST /api/user-apis/test - Testar conexão da API
export async function POST(request: NextRequest) {
  try {
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
    // Se for erro de token inválido, retornar 401
    const status = message.includes('Token inválido') || message.includes('401') || message.includes('403') ? 401 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

