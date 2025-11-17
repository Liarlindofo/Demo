#!/usr/bin/env tsx
/**
 * Script para limpar registros com apiId NULL em sales_daily
 * Necessário antes do db:push quando o schema exige apiId obrigatório
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpando registros com apiId NULL em sales_daily...\n');

  try {
    // Contar registros com apiId NULL
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM sales_daily
      WHERE "apiId" IS NULL
    `;

    const count = Number(countResult[0]?.count || 0);

    if (count === 0) {
      console.log('✅ Nenhum registro com apiId NULL encontrado.\n');
      return;
    }

    console.log(`⚠️  Encontrados ${count} registros com apiId NULL. Removendo...\n`);

    // Deletar registros com apiId NULL
    await prisma.$executeRaw`
      DELETE FROM sales_daily
      WHERE "apiId" IS NULL
    `;

    console.log(`✅ ${count} registros removidos com sucesso!\n`);
  } catch (error) {
    console.error('❌ Erro ao limpar registros:', error);
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

