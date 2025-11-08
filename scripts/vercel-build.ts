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
      runCommand('npm run db:push', 'Criando/atualizando tabelas do banco');
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

