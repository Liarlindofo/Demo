#!/usr/bin/env tsx
/**
 * Script de migração: atualiza storeId NULL para registros existentes em user_apis
 * Formato: store_${id}
 */

import { db } from '../src/lib/db';

async function main() {
  console.log('🔄 Iniciando migração de storeIds...\n');

  // Buscar todas as APIs (usar SQL raw para contornar validação do Prisma)
  // Como o schema agora exige storeId, precisamos usar uma query mais flexível
  const allApis = await db.$queryRaw<Array<{ id: string; name: string; storeId: string | null }>>`
    SELECT id, name, "storeId" 
    FROM user_apis 
    WHERE "storeId" IS NULL OR "storeId" LIKE 'temp_%'
  `;
  
  const apisWithoutStoreId = allApis.map(api => ({
    id: api.id,
    name: api.name,
  }));

  console.log(`📊 Encontradas ${apisWithoutStoreId.length} APIs sem storeId válido\n`);

  if (apisWithoutStoreId.length === 0) {
    console.log('✅ Nenhuma API precisa de migração!');
    return;
  }

  // Atualizar cada API usando SQL raw para contornar validação do Prisma
  for (const api of apisWithoutStoreId) {
    const storeId = `store_${api.id}`;
    await db.$executeRaw`
      UPDATE user_apis 
      SET "storeId" = ${storeId}
      WHERE id = ${api.id}
    `;
    console.log(`✅ API "${api.name}" (${api.id}) → storeId: ${storeId}`);
  }

  console.log(`\n✅ Migração concluída! ${apisWithoutStoreId.length} APIs atualizadas.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

