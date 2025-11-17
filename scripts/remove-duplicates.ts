#!/usr/bin/env tsx
/**
 * Script para remover duplicatas em sales_daily antes do db:push
 * Remove registros duplicados mantendo apenas o mais recente (por createdAt)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando duplicatas em sales_daily (apiId, date)...\n');

  try {
    // Encontrar duplicatas
    const duplicates = await prisma.$queryRaw<Array<{ apiId: string; date: Date; count: bigint }>>`
      SELECT "apiId", date, COUNT(*) as count
      FROM sales_daily
      GROUP BY "apiId", date
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada.\n');
      return;
    }

    console.log(`⚠️  Encontradas ${duplicates.length} combinações (apiId, date) com duplicatas.\n`);

    let totalRemoved = 0;

    // Para cada duplicata, manter apenas o registro mais recente
    for (const dup of duplicates) {
      const apiId = dup.apiId;
      const date = dup.date instanceof Date ? dup.date : new Date(dup.date);
      const count = Number(dup.count);

      console.log(`🔧 Removendo ${count - 1} duplicata(s) para apiId=${apiId}, date=${date.toISOString().split('T')[0]}...`);

      // Buscar todos os IDs para esta combinação
      const allIds = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>`
        SELECT id, "createdAt"
        FROM sales_daily
        WHERE "apiId" = ${apiId} AND date = ${date}
        ORDER BY "createdAt" DESC
      `;

      if (allIds.length <= 1) continue;

      // Manter apenas o primeiro (mais recente) e deletar os outros
      const idsToDelete = allIds.slice(1).map(r => r.id);

      for (const idToDelete of idsToDelete) {
        await prisma.salesDaily.delete({
          where: { id: idToDelete },
        });
      }

      totalRemoved += idsToDelete.length;
      console.log(`   ✅ ${idsToDelete.length} registro(s) removido(s)`);
    }

    console.log(`\n✅ Total de ${totalRemoved} registros duplicados removidos!\n`);
  } catch (error) {
    console.error('❌ Erro ao remover duplicatas:', error);
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

