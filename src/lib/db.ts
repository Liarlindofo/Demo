import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

// Configurar PrismaClient com pool de conexões otimizado para produção
export const db: PrismaClient = global.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Garantir que apenas uma instância do Prisma existe
if (process.env.NODE_ENV !== 'production') global.prisma = db

// Graceful shutdown - desconectar quando o processo terminar
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}


