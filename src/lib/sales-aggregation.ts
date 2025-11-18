import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Agrega dados de vendas individuais (tabela Sale) para dados diários (tabela SalesDaily)
 * Calcula:
 * - Total de vendas (totalSales)
 * - Total de pedidos (totalOrders)
 * - Número de clientes únicos (uniqueCustomers)
 * - Ticket médio (calculado automaticamente: totalSales / totalOrders)
 */

type AggregationResult = {
  success: boolean
  daysAggregated: number
  totalSales: number
  totalOrders: number
  uniqueCustomers: number
  errors: string[]
}

/**
 * Extrai o id do cliente de um registro de venda (rawJson)
 */
function extractCustomerId(rawJson: Prisma.JsonValue): string | null {
  try {
    if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
      return null
    }

    const sale = rawJson as Record<string, unknown>

    // Tentar extrair customer.id_customer
    const customer = sale.customer
    if (customer && typeof customer === 'object' && !Array.isArray(customer)) {
      const customerObj = customer as Record<string, unknown>
      const customerId = customerObj.id_customer
      if (customerId && typeof customerId === 'string') {
        return customerId
      }
      if (customerId && typeof customerId === 'number') {
        return String(customerId)
      }
    }

    // Tentar extrair id_customer diretamente
    const directCustomerId = sale.id_customer
    if (directCustomerId && typeof directCustomerId === 'string') {
      return directCustomerId
    }
    if (directCustomerId && typeof directCustomerId === 'number') {
      return String(directCustomerId)
    }

    // Tentar extrair customer_id
    const customerId2 = sale.customer_id
    if (customerId2 && typeof customerId2 === 'string') {
      return customerId2
    }
    if (customerId2 && typeof customerId2 === 'number') {
      return String(customerId2)
    }

    return null
  } catch (error) {
    console.error('Erro ao extrair customer ID:', error)
    return null
  }
}

/**
 * Agrega dados de vendas para um período específico
 */
export async function aggregateSalesData(
  apiId: string,
  storeId: string,
  startDate: Date,
  endDate: Date
): Promise<AggregationResult> {
  console.log('📊 Iniciando agregação de dados de vendas...')
  console.log(`   API ID: ${apiId}`)
  console.log(`   Store ID: ${storeId}`)
  console.log(`   Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}`)

  const result: AggregationResult = {
    success: true,
    daysAggregated: 0,
    totalSales: 0,
    totalOrders: 0,
    uniqueCustomers: 0,
    errors: [],
  }

  try {
    // Buscar todas as vendas do período
    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        saleDateUtc: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        saleDateUtc: true,
        totalAmount: true,
        rawJson: true,
        userId: true,
      },
      orderBy: {
        saleDateUtc: 'asc',
      },
    })

    console.log(`📊 Encontradas ${sales.length} vendas no período`)

    if (sales.length === 0) {
      console.log('⚠️ Nenhuma venda encontrada para agregar')
      return result
    }

    // Agrupar vendas por dia
    const salesByDay = new Map<string, typeof sales>()

    for (const sale of sales) {
      const dateKey = sale.saleDateUtc.toISOString().split('T')[0]
      if (!salesByDay.has(dateKey)) {
        salesByDay.set(dateKey, [])
      }
      salesByDay.get(dateKey)!.push(sale)
    }

    console.log(`📊 Vendas agrupadas em ${salesByDay.size} dias`)

    // Agregar dados para cada dia
    for (const [dateKey, daySales] of salesByDay.entries()) {
      try {
        // Calcular totais
        let totalSales = 0
        const totalOrders = daySales.length

        // Contar clientes únicos
        const uniqueCustomerIds = new Set<string>()

        for (const sale of daySales) {
          // Somar total de vendas
          if (sale.totalAmount !== null && sale.totalAmount !== undefined) {
            totalSales += sale.totalAmount
          }

          // Extrair customer ID
          const customerId = extractCustomerId(sale.rawJson)
          if (customerId) {
            uniqueCustomerIds.add(customerId)
          }
        }

        const uniqueCustomers = uniqueCustomerIds.size

        // Calcular ticket médio (será calculado no frontend também)
        const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0

        console.log(`📊 Dia ${dateKey}:`)
        console.log(`   - Total de vendas: R$ ${totalSales.toFixed(2)}`)
        console.log(`   - Total de pedidos: ${totalOrders}`)
        console.log(`   - Clientes únicos: ${uniqueCustomers}`)
        console.log(`   - Ticket médio: R$ ${averageTicket.toFixed(2)}`)

        // Buscar a API para obter o userId (necessário para futuras queries)
        const api = await prisma.userAPI.findUnique({
          where: { id: apiId },
          select: { userId: true },
        })

        if (!api) {
          result.errors.push(`API ${apiId} não encontrada`)
          continue
        }

        // Salvar dados agregados (upsert para evitar duplicatas)
        await prisma.salesDaily.upsert({
          where: {
            // Usar o constraint único apiId_date
            sales_daily_api_date_unique: {
              apiId,
              date: new Date(dateKey + 'T00:00:00.000Z'),
            },
          },
          create: {
            apiId,
            storeId,
            date: new Date(dateKey + 'T00:00:00.000Z'),
            totalSales,
            totalOrders,
            uniqueCustomers,
            // channels não precisa ser definido (é opcional)
          },
          update: {
            totalSales,
            totalOrders,
            uniqueCustomers,
            // Atualizar channels se necessário
          },
        })

        result.daysAggregated++
        result.totalSales += totalSales
        result.totalOrders += totalOrders
        result.uniqueCustomers += uniqueCustomers

        console.log(`✅ Dados do dia ${dateKey} salvos com sucesso`)
      } catch (error) {
        const errorMsg = `Erro ao agregar dia ${dateKey}: ${error instanceof Error ? error.message : String(error)}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
        result.success = false
      }
    }

    console.log('📊 Agregação concluída:')
    console.log(`   - Dias agregados: ${result.daysAggregated}`)
    console.log(`   - Total de vendas: R$ ${result.totalSales.toFixed(2)}`)
    console.log(`   - Total de pedidos: ${result.totalOrders}`)
    console.log(`   - Total de clientes únicos: ${result.uniqueCustomers}`)
    console.log(`   - Erros: ${result.errors.length}`)

    return result
  } catch (error) {
    const errorMsg = `Erro geral na agregação: ${error instanceof Error ? error.message : String(error)}`
    console.error(`❌ ${errorMsg}`)
    result.errors.push(errorMsg)
    result.success = false
    return result
  }
}

/**
 * Agrega dados para todas as APIs ativas
 */
export async function aggregateAllAPIs(days: number = 15): Promise<{
  success: boolean
  apisProcessed: number
  totalDaysAggregated: number
  errors: string[]
}> {
  console.log('📊 Iniciando agregação para todas as APIs ativas...')

  const result = {
    success: true,
    apisProcessed: 0,
    totalDaysAggregated: 0,
    errors: [] as string[],
  }

  try {
    // Buscar todas as APIs ativas do tipo Saipos
    const apis = await prisma.userAPI.findMany({
      where: {
        type: 'saipos',
        enabled: true,
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        userId: true,
      },
    })

    console.log(`📊 Encontradas ${apis.length} APIs ativas para agregar`)

    // Calcular período (últimos N dias)
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    // Agregar dados para cada API
    for (const api of apis) {
      try {
        console.log(`📊 Processando API: ${api.name} (${api.id})`)

        const aggregationResult = await aggregateSalesData(
          api.id,
          api.storeId,
          startDate,
          endDate
        )

        result.apisProcessed++
        result.totalDaysAggregated += aggregationResult.daysAggregated

        if (!aggregationResult.success) {
          result.success = false
          result.errors.push(...aggregationResult.errors)
        }

        console.log(`✅ API ${api.name} processada com sucesso`)
      } catch (error) {
        const errorMsg = `Erro ao processar API ${api.name} (${api.id}): ${error instanceof Error ? error.message : String(error)}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
        result.success = false
      }
    }

    console.log('📊 Agregação de todas as APIs concluída:')
    console.log(`   - APIs processadas: ${result.apisProcessed}`)
    console.log(`   - Total de dias agregados: ${result.totalDaysAggregated}`)
    console.log(`   - Erros: ${result.errors.length}`)

    return result
  } catch (error) {
    const errorMsg = `Erro geral ao agregar todas as APIs: ${error instanceof Error ? error.message : String(error)}`
    console.error(`❌ ${errorMsg}`)
    result.errors.push(errorMsg)
    result.success = false
    return result
  }
}

