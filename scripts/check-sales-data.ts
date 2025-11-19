#!/usr/bin/env tsx
/**
 * Script para verificar dados em sales_daily
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando dados em sales_daily...\n');

  try {
    // Contar total de registros
    const total = await prisma.salesDaily.count();
    console.log(`📊 Total de registros: ${total}\n`);

    if (total === 0) {
      console.log('⚠️  Tabela está vazia! Execute /api/saipos/sync-all para popular.\n');
      return;
    }

    // Buscar registros mais recentes
    const recent = await prisma.salesDaily.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        apiId: true,
        storeId: true,
        date: true,
        totalOrders: true,
        totalSales: true,
        channels: true,
        createdAt: true,
      },
    });

    console.log('📊 Últimos 10 registros:\n');
    recent.forEach((r, i) => {
      const averageTicket = r.totalOrders > 0 ? r.totalSales / r.totalOrders : 0;
      console.log(`${i + 1}. ${r.date.toISOString().split('T')[0]}`);
      console.log(`   - Pedidos: ${r.totalOrders}`);
      console.log(`   - Vendas: R$ ${r.totalSales.toFixed(2)}`);
      console.log(`   - Ticket Médio: R$ ${averageTicket.toFixed(2)}`);
      console.log(`   - Canais:`, r.channels);
      console.log(`   - StoreId: ${r.storeId}`);
      console.log(`   - ApiId: ${r.apiId}\n`);
    });

    // Calcular totais
    const totals = recent.reduce(
      (acc, r) => ({
        totalOrders: acc.totalOrders + r.totalOrders,
        totalSales: acc.totalSales + r.totalSales,
      }),
      { totalOrders: 0, totalSales: 0 }
    );

    const overallAverage = totals.totalOrders > 0 
      ? totals.totalSales / totals.totalOrders 
      : 0;

    console.log('📊 Resumo dos últimos 10 registros:');
    console.log(`   - Total de pedidos: ${totals.totalOrders}`);
    console.log(`   - Total de vendas: R$ ${totals.totalSales.toFixed(2)}`);
    console.log(`   - Ticket médio: R$ ${overallAverage.toFixed(2)}\n`);

    // Verificar registros com totalSales = 0 mas totalOrders > 0
    const zeroSales = await prisma.salesDaily.count({
      where: {
        totalOrders: { gt: 0 },
        totalSales: 0,
      },
    });

    if (zeroSales > 0) {
      console.log(`⚠️  ATENÇÃO: ${zeroSales} registros têm pedidos mas vendas = R$ 0,00!`);
      console.log(`   Isso pode indicar que a API Saipos não está retornando valores.\n`);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


