#!/usr/bin/env tsx
/**
 * Script de backfill: corrige userId NULL em sales_daily antes do db:push
 * Usa user_apis como fonte da verdade
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando backfill de userId em sales_daily...\n');

  // Buscar todas as APIs Saipos com storeId
  const apis = await prisma.$queryRaw<Array<{ id: string; userId: string; storeId: string; name: string }>>`
    SELECT id, "userId", "storeId", name
    FROM user_apis
    WHERE type = 'saipos' AND "storeId" IS NOT NULL
  `;

  console.log(`📊 Encontradas ${apis.length} APIs Saipos com storeId\n`);

  if (apis.length === 0) {
    console.log('✅ Nenhuma API encontrada. Nada para corrigir.');
    return;
  }

  let totalFixed = 0;

  // Para cada API, atualizar registros com userId NULL ou incorreto
  for (const api of apis) {
    // Primeiro, contar quantos registros precisam ser corrigidos
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM sales_daily
      WHERE "storeId" = ${api.storeId}
        AND ("userId" IS NULL OR "userId" = '' OR "userId" != ${api.userId})
    `;

    const count = Number(countResult[0]?.count || 0);

    if (count > 0) {
      // Atualizar os registros
      await prisma.$executeRaw`
        UPDATE sales_daily
        SET "userId" = ${api.userId}
        WHERE "storeId" = ${api.storeId}
          AND ("userId" IS NULL OR "userId" = '' OR "userId" != ${api.userId})
      `;

      totalFixed += count;
      console.log(`✅ API "${api.name}" (${api.storeId}): ${count} registros corrigidos`);
    }
  }

  if (totalFixed > 0) {
    console.log(`\n✅ Backfill concluído! Total de registros corrigidos: ${totalFixed}`);
  } else {
    console.log('\n✅ Nenhum registro precisou de correção');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




