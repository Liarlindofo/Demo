#!/usr/bin/env tsx
/**
 * Script para verificar se o Prisma Client está gerado corretamente
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🔍 Verificando Prisma Client...\n');
  
  try {
    const db = new PrismaClient();
    
    // Verificar se o modelo salesDaily existe
    const salesDailyModel = (db as { salesDaily?: unknown }).salesDaily; if (!salesDailyModel) {
      console.error('❌ Modelo salesDaily não encontrado no Prisma Client');
      console.log('\n💡 Solução: Execute os seguintes comandos:');
      console.log('   1. npx prisma generate');
      console.log('   2. npx prisma db push (se necessário)');
      process.exit(1);
    }
    
    console.log('✅ Modelo salesDaily encontrado');
    
    // Tentar conectar ao banco
    try {
      await db.$connect();
      console.log('✅ Conexão com banco de dados estabelecida');
      
      // Verificar se a tabela existe
      try {
        const count = await (db as unknown as { salesDaily: { count: () => Promise<number> } }).salesDaily.count();
        console.log(`✅ Tabela sales_daily existe e tem ${count} registros`);
      } catch (error) {
        console.error('❌ Erro ao acessar tabela sales_daily:', error);
        console.log('\n💡 Solução: Execute: npx prisma db push');
      }
      
      await db.$disconnect();
    } catch (error) {
      console.error('❌ Erro ao conectar ao banco de dados:', error);
      console.log('\n💡 Verifique se a variável DATABASE_URL está configurada corretamente');
    }
    
    console.log('\n✅ Verificação concluída!');
  } catch (error) {
    console.error('❌ Erro ao verificar Prisma Client:', error);
    console.log('\n💡 Solução: Execute: npx prisma generate');
    process.exit(1);
  }
}

main().catch(console.error);

