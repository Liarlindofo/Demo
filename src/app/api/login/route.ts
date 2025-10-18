import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { loginSchema } from '@/lib/validation';
import { EmailService } from '@/lib/sendgrid';
import '@/lib/db-init'; // Inicializar banco automaticamente

// Armazenar OTPs temporariamente (em produção, use Redis ou banco de dados)
const otpStorage = new Map<string, { otp: string; expires: number; userId: string }>();

// Função para criar Prisma Client com tratamento de erro
function createPrismaClient() {
  try {
    return new PrismaClient();
  } catch (error) {
    console.error('Erro ao criar Prisma Client:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados do formulário
    const validatedData = loginSchema.parse(body);
    
    // Tentar conectar com o banco de dados
    const prisma = createPrismaClient();
    let user = null;
    
    if (prisma) {
      try {
        // Buscar usuário por email ou username
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: validatedData.email },
              { username: validatedData.email }
            ]
          }
        });
        
        if (user) {
          // Verificar senha
          const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
          
          if (!isPasswordValid) {
            await prisma.$disconnect();
            return NextResponse.json(
              { error: 'Senha incorreta' },
              { status: 401 }
            );
          }
        }
        
        await prisma.$disconnect();
      } catch (dbError) {
        console.error('Erro de banco de dados:', dbError);
        // Continuar sem banco de dados se houver erro
      }
    }
    
    // Se não encontrou usuário no banco, verificar credenciais hardcoded
    if (!user) {
      if (validatedData.email === "DrinAdmin2157" && validatedData.password === "21571985") {
        user = {
          id: "admin-1",
          email: "admin@drin.com",
          username: "DrinAdmin2157",
          fullName: "Administrador Drin",
          isAdmin: true
        };
      } else {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }
    }
    
    // Gerar OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutos
    
    // Armazenar OTP temporariamente
    const tempKey = `${user.email}_${Date.now()}`;
    otpStorage.set(tempKey, {
      otp,
      expires,
      userId: user.id
    });
    
    // Tentar enviar OTP por email
    let emailSent = false;
    try {
      emailSent = await EmailService.sendOTP(
        user.email,
        otp,
        user.fullName || user.username
      );
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
    }
    
    // Se o email falhou, mostrar OTP no console
    if (!emailSent) {
      console.log(`\n🔑 ===== OTP GERADO =====`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔢 Código: ${otp}`);
      console.log(`⏰ Expira em: 10 minutos`);
      console.log(`========================\n`);
    }
    
    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Código de verificação enviado para seu email'
        : 'Código de verificação gerado (verifique o console)',
      tempKey, // Usado para verificar o OTP
      emailSent,
      debugUrl: !emailSent ? `/auth/debug-otp?email=${encodeURIComponent(user.email)}&otp=${otp}` : null
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para verificar OTP de login (pode ser chamada de outra API)
export async function verifyLoginOTP(tempKey: string, otp: string) {
  try {
    // Buscar dados temporários
    const tempData = otpStorage.get(tempKey);
    
    if (!tempData) {
      return { success: false, error: 'Código de verificação expirado ou inválido' };
    }
    
    // Verificar se o OTP expirou
    if (Date.now() > tempData.expires) {
      otpStorage.delete(tempKey);
      return { success: false, error: 'Código de verificação expirado' };
    }
    
    // Verificar se o OTP está correto
    if (tempData.otp !== otp) {
      return { success: false, error: 'Código de verificação incorreto' };
    }
    
    // Buscar usuário
    const prisma = createPrismaClient();
    let user = null;
    
    if (prisma) {
      try {
        user = await prisma.user.findUnique({
          where: { id: tempData.userId }
        });
        await prisma.$disconnect();
      } catch (dbError) {
        console.error('Erro ao buscar usuário:', dbError);
        // Continuar sem banco de dados se houver erro
      }
    }
    
    // Se não encontrou no banco, usar dados temporários
    if (!user) {
      user = {
        id: tempData.userId,
        email: "admin@drin.com",
        username: "DrinAdmin2157",
        fullName: "Administrador Drin",
        isAdmin: true
      };
    }
    
    // Limpar dados temporários
    otpStorage.delete(tempKey);
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    };
    
  } catch (error) {
    console.error('Erro na verificação do OTP de login:', error);
    return { success: false, error: 'Erro interno do servidor' };
  }
}