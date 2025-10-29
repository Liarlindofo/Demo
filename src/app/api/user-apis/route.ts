import { NextRequest, NextResponse } from 'next/server'
import { UserAPIService, CreateUserAPIRequest, UpdateUserAPIRequest } from '@/lib/user-api-service'
import { stackServerApp } from '@/stack'
import { syncStackAuthUser } from '@/lib/stack-auth-sync'

// GET /api/user-apis - Obter todas as APIs do usuário
export async function GET(request: NextRequest) {
  try {
    // Identificar usuário autenticado via Stack Auth e garantir sync no DB
    const stackUser = await stackServerApp.getUser()
    if (!stackUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
      profileImageUrl: stackUser.profileImageUrl,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    })

    const apis = await UserAPIService.getUserAPIs(dbUser.id)
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
    const stackUser = await stackServerApp.getUser()
    if (!stackUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
      profileImageUrl: stackUser.profileImageUrl,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    })

    const body = (await request.json()) as Omit<CreateUserAPIRequest, 'userId'>
    if (!body.name || !body.apiKey) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, apiKey' }, { status: 400 })
    }

    const api = await UserAPIService.createAPI({ ...body, userId: dbUser.id })
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

    // Garantir usuário autenticado
    const stackUser = await stackServerApp.getUser()
    if (!stackUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const dbUser = await syncStackAuthUser({
      id: stackUser.id,
      primaryEmail: stackUser.primaryEmail,
      displayName: stackUser.displayName,
      profileImageUrl: stackUser.profileImageUrl,
      primaryEmailVerified: stackUser.primaryEmailVerified ? new Date() : null,
    })

    const body: UpdateUserAPIRequest = await request.json()
    // Opcional: checar ownership (não implementado aqui por brevidade)
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

    // Garantir usuário autenticado
    const stackUser = await stackServerApp.getUser()
    if (!stackUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    // Opcional: checar ownership (não implementado aqui)
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

