import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  // Verificar credenciais de login com banco de dados
  static async validateCredentials(credentials: LoginCredentials): Promise<User | null> {
    try {
      // Buscar usuário por email ou username
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

		// Garantir que ambas as senhas são strings válidas antes de comparar
		const hashedPassword = user.password;
		if (typeof credentials.password !== 'string' || typeof hashedPassword !== 'string') {
			// Evitar chamar bcrypt.compare com valores inválidos
			return null; // ou: throw new Error('Dados incompletos para autenticação')
		}

		const isPasswordValid = await bcrypt.compare(credentials.password, hashedPassword);
      
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
    } catch (error) {
      console.error('Erro ao validar credenciais:', error);
      return null;
    }
  }

  // Criar usuário administrador
  static async createAdminUser() {
    try {
      const existingAdmin = await prisma.user.findFirst({
        where: { isAdmin: true }
      });

      if (existingAdmin) {
        console.log('Usuário administrador já existe');
        return existingAdmin;
      }

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

      console.log('Usuário administrador criado:', admin);
      return admin;
    } catch (error) {
      console.error('Erro ao criar usuário administrador:', error);
      return null;
    }
  }

  // Buscar usuário por ID
  static async getUserById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || undefined,
        isAdmin: user.isAdmin
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  // Verificar se email já existe
  static async emailExists(email: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      return !!user;
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return false;
    }
  }

  // Verificar se CNPJ já existe
  static async cnpjExists(cnpj: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: { cnpj }
      });
      return !!user;
    } catch (error) {
      console.error('Erro ao verificar CNPJ:', error);
      return false;
    }
  }

  // Criar novo usuário
  static async createUser(userData: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    cnpj: string;
    birthDate: Date;
  }): Promise<User | null> {
    try {
      // Verificar se email já existe
      const existingEmail = await this.emailExists(userData.email);
      if (existingEmail) {
        throw new Error('Este email já está cadastrado');
      }

      // Verificar se CNPJ já existe
      const existingCNPJ = await this.cnpjExists(userData.cnpj);
      if (existingCNPJ) {
        throw new Error('Este CNPJ já está cadastrado');
      }

      // Criptografar senha
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          fullName: userData.fullName,
          cnpj: userData.cnpj,
          birthDate: userData.birthDate,
          isAdmin: false
        }
      });

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || undefined,
        isAdmin: user.isAdmin
      };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }
}

export default AuthService;