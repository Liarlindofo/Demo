/**
 * Script para testar a agregação de dados de vendas
 * 
 * Uso:
 * npx ts-node scripts/test-aggregation.ts
 */

import { PrismaClient } from '@prisma/client';
import { aggregateSalesData, aggregateAllAPIs } from '../src/lib/sales-aggregation';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Iniciando teste de agregação de dados...\n');

  try {
    // 1. Verificar se há APIs cadastradas
    console.log('1️⃣ Verificando APIs cadastradas...');
    const apis = await prisma.userAPI.findMany({
      where: {
        type: 'saipos',
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        storeId: true,
        userId: true,
      },
    });

    console.log(`   ✅ Encontradas ${apis.length} APIs ativas\n`);

    if (apis.length === 0) {
      console.log('   ⚠️ Nenhuma API ativa encontrada. Certifique-se de ter APIs cadastradas e habilitadas.');
      return;
    }

    // Mostrar APIs encontradas
    apis.forEach((api, index) => {
      console.log(`   ${index + 1}. ${api.name} (${api.id})`);
      console.log(`      Store ID: ${api.storeId}`);
      console.log(`      User ID: ${api.userId}\n`);
    });

    // 2. Verificar se há vendas na tabela Sale
    console.log('2️⃣ Verificando vendas na tabela Sale...');
    const salesCount = await prisma.sale.count();
    console.log(`   ✅ Total de vendas: ${salesCount}\n`);

    if (salesCount === 0) {
      console.log('   ⚠️ Nenhuma venda encontrada. Execute a sincronização primeiro.');
      console.log('   Comando: POST /api/saipos/sync ou GET /api/saipos/sync-all\n');
      return;
    }

    // Mostrar amostra de vendas
    const sampleSales = await prisma.sale.findMany({
      take: 3,
      select: {
        id: true,
        externalId: true,
        storeId: true,
        saleDateUtc: true,
        totalAmount: true,
      },
      orderBy: {
        saleDateUtc: 'desc',
      },
    });

    console.log('   📊 Amostra de vendas:');
    sampleSales.forEach((sale, index) => {
      console.log(`   ${index + 1}. ${sale.externalId}`);
      console.log(`      Data: ${sale.saleDateUtc.toISOString().split('T')[0]}`);
      console.log(`      Total: R$ ${sale.totalAmount?.toFixed(2) || '0.00'}`);
      console.log(`      Store ID: ${sale.storeId}\n`);
    });

    // 3. Testar agregação para a primeira API
    const firstApi = apis[0];
    console.log(`3️⃣ Testando agregação para API: ${firstApi.name}...\n`);

    // Calcular período (últimos 15 dias)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 14); // 15 dias incluindo hoje
    startDate.setHours(0, 0, 0, 0);

    console.log(`   Período: ${startDate.toISOString().split('T')[0]} até ${endDate.toISOString().split('T')[0]}\n`);

    const result = await aggregateSalesData(
      firstApi.id,
      firstApi.storeId,
      startDate,
      endDate
    );

    console.log('   📊 Resultado da agregação:');
    console.log(`   - Sucesso: ${result.success ? '✅ Sim' : '❌ Não'}`);
    console.log(`   - Dias agregados: ${result.daysAggregated}`);
    console.log(`   - Total de vendas: R$ ${result.totalSales.toFixed(2)}`);
    console.log(`   - Total de pedidos: ${result.totalOrders}`);
    console.log(`   - Clientes únicos: ${result.uniqueCustomers}`);
    console.log(`   - Ticket médio: R$ ${result.totalOrders > 0 ? (result.totalSales / result.totalOrders).toFixed(2) : '0.00'}`);

    if (result.errors.length > 0) {
      console.log(`   - Erros: ${result.errors.length}`);
      result.errors.forEach((error, index) => {
        console.log(`     ${index + 1}. ${error}`);
      });
    }

    console.log('');

    // 4. Verificar dados agregados na tabela SalesDaily
    console.log('4️⃣ Verificando dados agregados na tabela SalesDaily...');
    const salesDaily = await prisma.salesDaily.findMany({
      where: {
        apiId: firstApi.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        totalSales: true,
        totalOrders: true,
        uniqueCustomers: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    console.log(`   ✅ Total de registros: ${salesDaily.length}\n`);

    if (salesDaily.length > 0) {
      console.log('   📊 Amostra de dados agregados:');
      const sample = salesDaily.slice(0, 5);
      sample.forEach((day, index) => {
        const avgTicket = day.totalOrders > 0 ? day.totalSales / day.totalOrders : 0;
        console.log(`   ${index + 1}. ${day.date.toISOString().split('T')[0]}`);
        console.log(`      Vendas: R$ ${day.totalSales.toFixed(2)}`);
        console.log(`      Pedidos: ${day.totalOrders}`);
        console.log(`      Clientes únicos: ${day.uniqueCustomers}`);
        console.log(`      Ticket médio: R$ ${avgTicket.toFixed(2)}\n`);
      });
    }

    // 5. Resumo final
    console.log('✅ Teste concluído com sucesso!\n');
    console.log('📋 Resumo:');
    console.log(`   - APIs ativas: ${apis.length}`);
    console.log(`   - Total de vendas: ${salesCount}`);
    console.log(`   - Dias agregados: ${result.daysAggregated}`);
    console.log(`   - Registros em SalesDaily: ${salesDaily.length}\n`);

    console.log('🎯 Próximos passos:');
    console.log('   1. Acesse o dashboard para visualizar os dados');
    console.log('   2. Use a rota GET /api/saipos/aggregate?days=15 para reagregar dados');
    console.log('   3. Verifique os clientes únicos e ticket médio nos relatórios\n');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error(error instanceof Error ? error.stack : '');
  } finally {
    await prisma.$disconnect();
  }
}

main();

