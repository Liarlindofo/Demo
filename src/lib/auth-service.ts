// import { PrismaClient } from '../generated/prisma';
// import bcrypt from 'bcryptjs';

// const prisma = new PrismaClient();

export interface LoginCredentials {
  email: string; // Pode ser email ou username
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  isAdmin: boolean;
}

export class AuthService {
  // Verificar credenciais de login (versão simplificada sem banco)
  static async validateCredentials(credentials: LoginCredentials): Promise<User | null> {
    try {
      // Por enquanto, usar credenciais hardcoded
      // Quando você configurar o Neon, descomente o código abaixo
      
      if (credentials.email === "DrinAdmin2157" && credentials.password === "21571985") {
        return {
          id: "admin-1",
          username: "DrinAdmin2157",
          email: "admin@drin.com",
          fullName: "Administrador Drin",
          isAdmin: true
        };
      }

      // Código para usar com banco de dados (descomente quando configurar o Neon):
      /*
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: credentials.email },
            { username: credentials.email }
          ]
        }
      });

      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      
      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || undefined,
        isAdmin: user.isAdmin
      };
      */

      return null;
    } catch (error) {
      console.error('Erro ao validar credenciais:', error);
      return null;
    }
  }

  // Métodos para quando configurar o banco de dados:
  // - createAdminUser()
  // - createUser()
  // - etc.
}

export default AuthService;
