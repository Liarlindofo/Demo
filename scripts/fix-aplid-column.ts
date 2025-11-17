#!/usr/bin/env tsx
/**
 * Script para corrigir a coluna aplid -> apiId no banco de dados
 * Este script verifica se existe a coluna aplid e a renomeia para apiId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando estrutura da tabela sales_daily...\n');

  try {
    // Verificar se existe a coluna aplid
    const checkAplid = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sales_daily'
        AND column_name = 'aplid'
    `;

    if (checkAplid.length > 0) {
      console.log('⚠️  Coluna aplid encontrada! Renomeando para apiId...\n');

      // Verificar se a coluna apiId já existe
      const checkApiId = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_daily'
          AND column_name = 'apiId'
      `;

      if (checkApiId.length > 0) {
        console.log('⚠️  Coluna apiId já existe! Migrando dados de aplid para apiId...\n');
        
        // Migrar dados de aplid para apiId
        await prisma.$executeRaw`
          UPDATE sales_daily
          SET "apiId" = "aplid"
          WHERE ("apiId" IS NULL OR "apiId" = '')
            AND "aplid" IS NOT NULL
        `;

        console.log('✅ Dados migrados de aplid para apiId\n');
      }

      // Renomear a coluna aplid para apiId (se ainda existir)
      await prisma.$executeRaw`
        ALTER TABLE sales_daily
        RENAME COLUMN "aplid" TO "apiId"
      `;

      console.log('✅ Coluna aplid renomeada para apiId\n');
    } else {
      console.log('✅ Coluna aplid não encontrada. Verificando apiId...\n');

      // Verificar se apiId existe
      const checkApiId = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sales_daily'
          AND column_name = 'apiId'
      `;

      if (checkApiId.length > 0) {
        console.log('✅ Coluna apiId já existe e está correta!\n');
      } else {
        console.log('❌ Coluna apiId não encontrada! Criando...\n');

        // Criar a coluna apiId
        await prisma.$executeRaw`
          ALTER TABLE sales_daily
          ADD COLUMN "apiId" TEXT
        `;

        console.log('✅ Coluna apiId criada\n');
      }
    }

    // Verificar índices e constraints
    console.log('🔍 Verificando índices e constraints...\n');

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'sales_daily'
        AND indexname LIKE '%aplid%'
    `;

    if (indexes.length > 0) {
      console.log(`⚠️  Encontrados ${indexes.length} índices com aplid. Eles precisam ser recriados manualmente.\n`);
      indexes.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log('✅ Nenhum índice com aplid encontrado\n');
    }

    // Verificar foreign keys
    const foreignKeys = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'sales_daily'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%aplid%'
    `;

    if (foreignKeys.length > 0) {
      console.log(`⚠️  Encontradas ${foreignKeys.length} foreign keys com aplid. Elas precisam ser recriadas manualmente.\n`);
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.constraint_name}`);
      });
    } else {
      console.log('✅ Nenhuma foreign key com aplid encontrada\n');
    }

    console.log('✅ Verificação concluída!\n');
  } catch (error) {
    console.error('❌ Erro ao verificar/corrigir:', error);
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

