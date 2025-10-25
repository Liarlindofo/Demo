import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserAPIConfig {
  id: string
  userId: string
  name: string
  type: 'saipos' | 'custom' | 'whatsapp'
  apiKey: string
  baseUrl?: string
  status: 'connected' | 'disconnected' | 'error'
  lastTest?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserAPIRequest {
  userId: string
  name: string
  type: 'saipos' | 'custom' | 'whatsapp'
  apiKey: string
  baseUrl?: string
}

export interface UpdateUserAPIRequest {
  name?: string
  apiKey?: string
  baseUrl?: string
  status?: 'connected' | 'disconnected' | 'error'
  lastTest?: Date
}

export class UserAPIService {
  // Criar nova API para usuário
  static async createAPI(data: CreateUserAPIRequest): Promise<UserAPIConfig> {
    try {
      const api = await prisma.userAPI.create({
        data: {
          userId: data.userId,
          name: data.name,
          type: data.type,
          apiKey: data.apiKey,
          baseUrl: data.baseUrl || 'https://api.saipos.com',
          status: 'disconnected'
        }
      })

      console.log(`✅ API ${data.name} criada para usuário ${data.userId}`)
      return api as UserAPIConfig
    } catch (error) {
      console.error('❌ Erro ao criar API:', error)
      throw new Error('Erro ao criar configuração da API')
    }
  }

  // Obter todas as APIs de um usuário
  static async getUserAPIs(userId: string): Promise<UserAPIConfig[]> {
    try {
      const apis = await prisma.userAPI.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })

      console.log(`📱 ${apis.length} APIs encontradas para usuário ${userId}`)
      return apis as UserAPIConfig[]
    } catch (error) {
      console.error('❌ Erro ao buscar APIs:', error)
      throw new Error('Erro ao buscar configurações das APIs')
    }
  }

  // Atualizar API
  static async updateAPI(apiId: string, data: UpdateUserAPIRequest): Promise<UserAPIConfig> {
    try {
      const api = await prisma.userAPI.update({
        where: { id: apiId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      })

      console.log(`✅ API ${apiId} atualizada`)
      return api as UserAPIConfig
    } catch (error) {
      console.error('❌ Erro ao atualizar API:', error)
      throw new Error('Erro ao atualizar configuração da API')
    }
  }

  // Deletar API
  static async deleteAPI(apiId: string): Promise<void> {
    try {
      await prisma.userAPI.delete({
        where: { id: apiId }
      })

      console.log(`✅ API ${apiId} removida`)
    } catch (error) {
      console.error('❌ Erro ao deletar API:', error)
      throw new Error('Erro ao remover configuração da API')
    }
  }

  // Obter API específica
  static async getAPI(apiId: string): Promise<UserAPIConfig | null> {
    try {
      const api = await prisma.userAPI.findUnique({
        where: { id: apiId }
      })

      return api as UserAPIConfig | null
    } catch (error) {
      console.error('❌ Erro ao buscar API:', error)
      throw new Error('Erro ao buscar configuração da API')
    }
  }

  // Testar conexão e atualizar status
  static async testAndUpdateAPI(apiId: string): Promise<UserAPIConfig> {
    try {
      const api = await this.getAPI(apiId)
      if (!api) {
        throw new Error('API não encontrada')
      }

      // Simular teste de conexão (aqui você implementaria o teste real)
      console.log(`🔗 Testando conexão com ${api.name}...`)
      console.log(`📍 URL: ${api.baseUrl}`)
      console.log(`🔑 API Key: ${api.apiKey.substring(0, 20)}...`)

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simular resposta da API (70% de chance de sucesso)
      const isConnected = Math.random() > 0.3
      const status = isConnected ? 'connected' : 'error'

      // Atualizar status no banco
      const updatedAPI = await this.updateAPI(apiId, {
        status,
        lastTest: new Date()
      })

      console.log(`✅ Teste concluído: ${status}`)
      return updatedAPI
    } catch (error) {
      console.error('❌ Erro ao testar API:', error)
      
      // Marcar como erro no banco
      await this.updateAPI(apiId, {
        status: 'error',
        lastTest: new Date()
      })

      throw error
    }
  }

  // Obter APIs conectadas de um usuário
  static async getConnectedAPIs(userId: string): Promise<UserAPIConfig[]> {
    try {
      const apis = await prisma.userAPI.findMany({
        where: { 
          userId,
          status: 'connected'
        },
        orderBy: { createdAt: 'desc' }
      })

      console.log(`🔗 ${apis.length} APIs conectadas para usuário ${userId}`)
      return apis as UserAPIConfig[]
    } catch (error) {
      console.error('❌ Erro ao buscar APIs conectadas:', error)
      throw new Error('Erro ao buscar APIs conectadas')
    }
  }
}

export default UserAPIService
