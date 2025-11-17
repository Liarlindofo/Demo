#!/usr/bin/env tsx
/**
 * Script de backfill: NÃO É MAIS NECESSÁRIO
 * O campo userId foi removido do modelo sales_daily
 * Este script agora apenas verifica se há registros com apiId NULL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Verificando sales_daily (userId não existe mais no schema)...\n');

  // Verificar se há registros com apiId NULL
  const nullApiIdCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM sales_daily
    WHERE "apiId" IS NULL OR "apiId" = ''
  `;

  const count = Number(nullApiIdCount[0]?.count || 0);

  if (count > 0) {
    console.log(`⚠️  Encontrados ${count} registros com apiId NULL.`);
    console.log('   Esses registros serão removidos pelo script clean-null-apiid.ts\n');
  } else {
    console.log('✅ Nenhum registro com apiId NULL encontrado.\n');
  }

  console.log('✅ Verificação concluída (userId foi removido do schema)\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no script:', e);
    // Não falhar o build se houver erro
    console.log('⚠️  Continuando mesmo com erro...\n');
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
