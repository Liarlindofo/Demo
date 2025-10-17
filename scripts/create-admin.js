import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Verificar se o usuário admin já existe
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'DrinAdmin2157' },
          { email: 'admin@drin.com' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('Usuário admin já existe!');
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash('21571985', 12);

    // Criar usuário admin
    const adminUser = await prisma.user.create({
      data: {
        username: 'DrinAdmin2157',
        email: 'admin@drin.com',
        password: hashedPassword,
        fullName: 'Administrador Drin',
        isAdmin: true,
      }
    });

    console.log('Usuário admin criado com sucesso:', adminUser);
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
