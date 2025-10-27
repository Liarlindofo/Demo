import { NextRequest, NextResponse } from 'next/server'
import { UserAPIService, CreateUserAPIRequest, UpdateUserAPIRequest } from '@/lib/user-api-service'

// GET /api/user-apis - Obter todas as APIs do usuário
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    const apis = await UserAPIService.getUserAPIs(userId)
    return NextResponse.json({ apis })
  } catch (error) {
    console.error('Erro ao buscar APIs:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/user-apis - Criar nova API
export async function POST(request: NextRequest) {
  try {
    const body: CreateUserAPIRequest = await request.json()

    if (!body.userId || !body.name || !body.apiKey) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userId, name, apiKey' },
        { status: 400 }
      )
    }

    const api = await UserAPIService.createAPI(body)
    return NextResponse.json({ api }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/user-apis - Atualizar API
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiId = searchParams.get('id')

    if (!apiId) {
      return NextResponse.json(
        { error: 'ID da API é obrigatório' },
        { status: 400 }
      )
    }

    const body: UpdateUserAPIRequest = await request.json()
    const api = await UserAPIService.updateAPI(apiId, body)
    
    return NextResponse.json({ api })
  } catch (error) {
    console.error('Erro ao atualizar API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/user-apis - Deletar API
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiId = searchParams.get('id')

    if (!apiId) {
      return NextResponse.json(
        { error: 'ID da API é obrigatório' },
        { status: 400 }
      )
    }

    await UserAPIService.deleteAPI(apiId)
    return NextResponse.json({ message: 'API removida com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

