import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Inicializando banco de dados...');

    // Criar usuário administrador
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('21571985', 12);
      
      const admin = await prisma.user.create({
        data: {
          email: 'admin@drin.com',
          username: 'DrinAdmin2157',
          password: hashedPassword,
          fullName: 'Administrador Drin',
          isAdmin: true
        }
      });

      console.log('✅ Usuário administrador criado:', admin.email);
    } else {
      console.log('ℹ️ Usuário administrador já existe:', existingAdmin.email);
    }

    // Criar algumas lojas de exemplo
    const existingStores = await prisma.store.count();
    
    if (existingStores === 0) {
      const admin = await prisma.user.findFirst({
        where: { isAdmin: true }
      });

      if (admin) {
        const stores = [
          {
            name: 'Restaurante Central',
            address: 'Rua das Flores, 123',
            phone: '(11) 99999-9999',
            cnpj: '12.345.678/0001-90',
            userId: admin.id
          },
          {
            name: 'Pizzaria do João',
            address: 'Av. Principal, 456',
            phone: '(11) 88888-8888',
            cnpj: '98.765.432/0001-10',
            userId: admin.id
          },
          {
            name: 'Lanchonete Express',
            address: 'Rua Comercial, 789',
            phone: '(11) 77777-7777',
            cnpj: '11.222.333/0001-44',
            userId: admin.id
          },
          {
            name: 'Café & Cia',
            address: 'Praça Central, 321',
            phone: '(11) 66666-6666',
            cnpj: '55.666.777/0001-88',
            userId: admin.id
          }
        ];

        for (const storeData of stores) {
          await prisma.store.create({
            data: storeData
          });
        }

        console.log('✅ Lojas de exemplo criadas');
      }
    } else {
      console.log('ℹ️ Lojas já existem no banco');
    }

    console.log('🎉 Banco de dados inicializado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });