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
  } catch (error) {
    console.error('Erro ao testar API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
