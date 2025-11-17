#!/usr/bin/env tsx
/**
 * Script de build para Vercel
 * Executa prisma generate, db push (se DATABASE_URL estiver configurado) e build
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

function runCommand(command: string, description: string) {
  console.log(`\n📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} concluído!`);
  } catch (error) {
    console.error(`❌ Erro ao executar: ${description}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando build para Vercel...\n');

  // 1. Gerar Prisma Client
  runCommand('npm run db:generate', 'Gerando Prisma Client');

  // 2. Verificar se DATABASE_URL está configurado
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  
  if (hasDatabaseUrl) {
    console.log('\n📊 DATABASE_URL encontrada, criando/atualizando tabelas...');
    try {
      // Primeiro, executar migração de storeIds se necessário
      console.log('\n🔄 Executando migração de storeIds...');
      try {
        runCommand('tsx scripts/migrate-store-ids.ts', 'Migrando storeIds');
      } catch (migrateError) {
        console.warn('⚠️  Aviso: Erro na migração de storeIds (pode ser que não haja registros para migrar)');
        // Continuar mesmo se a migração falhar
      }
      
      // Segundo, executar backfill de userId em sales_daily ANTES do db:push
      // Isso corrige registros com userId NULL para que o db:push não falhe
      console.log('\n🔄 Executando backfill de userId em sales_daily...');
      try {
        runCommand('tsx scripts/backfill-user-ids.ts', 'Backfill de userId');
      } catch (backfillError) {
        console.warn('⚠️  Aviso: Erro no backfill de userId (continuando mesmo assim)');
        console.warn('   Você pode executar manualmente: POST /api/debug/fix-store-ownership');
        // Continuar mesmo se o backfill falhar
      }
      
      // Terceiro, limpar registros com apiId NULL antes do db:push
      console.log('\n🧹 Limpando registros com apiId NULL...');
      try {
        runCommand('tsx scripts/clean-null-apiid.ts', 'Limpando apiId NULL');
      } catch (cleanError) {
        console.warn('⚠️  Aviso: Erro ao limpar apiId NULL (continuando mesmo assim)');
        // Continuar mesmo se a limpeza falhar
      }
      
      // Quarto, remover duplicatas antes do db:push
      console.log('\n🔍 Removendo duplicatas...');
      try {
        runCommand('tsx scripts/remove-duplicates.ts', 'Removendo duplicatas');
      } catch (dupError) {
        console.warn('⚠️  Aviso: Erro ao remover duplicatas (continuando mesmo assim)');
        // Continuar mesmo se a remoção falhar
      }
      
      // Depois, fazer db:push com flag para aceitar perda de dados se necessário
      try {
        runCommand('npm run db:push', 'Criando/atualizando tabelas do banco');
      } catch (pushError) {
        // Se falhar, tentar com --accept-data-loss
        console.warn('⚠️  db:push falhou, tentando com --accept-data-loss...');
        runCommand('npm run db:push:force', 'Criando/atualizando tabelas (forçado)');
      }
    } catch (error) {
      console.error('\n⚠️  Aviso: Erro ao criar tabelas. O build continuará, mas o banco pode não estar sincronizado.');
      console.error('   Certifique-se de que a DATABASE_URL está correta e o banco está acessível.');
      // Não falhar o build se db:push falhar - pode ser que as tabelas já existam
      // ou que o banco não esteja acessível durante o build
    }
  } else {
    console.log('\n⚠️  DATABASE_URL não encontrada. Pulando criação de tabelas.');
    console.log('   As tabelas devem ser criadas manualmente ou via migrações.');
  }

  // 3. Build do Next.js
  runCommand('npm run build', 'Fazendo build do Next.js');

  console.log('\n✅ Build concluído com sucesso!');
}

main().catch((error) => {
  console.error('\n❌ Erro fatal no build:', error);
  process.exit(1);
});

