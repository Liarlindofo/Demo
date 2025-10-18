import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { registerSchema, type RegisterFormData } from '@/lib/validation';
import { EmailService } from '@/lib/sendgrid';
import '@/lib/db-init'; // Inicializar banco automaticamente

// Armazenar OTPs temporariamente (em produção, use Redis ou banco de dados)
const otpStorage = new Map<string, { otp: string; expires: number; userData: RegisterFormData }>();

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
    const validatedData = registerSchema.parse(body);
    
    // Tentar conectar com o banco de dados
    const prisma = createPrismaClient();
    
    if (prisma) {
      try {
        // Verificar se o email já existe
        const existingUser = await prisma.user.findUnique({
          where: { email: validatedData.email }
        });
        
        if (existingUser) {
          await prisma.$disconnect();
          return NextResponse.json(
            { error: 'Este email já está cadastrado' },
            { status: 400 }
          );
        }
        
        // Verificar se o CNPJ já existe
        if (validatedData.cnpj) {
          const existingCNPJ = await prisma.user.findFirst({
            where: { cnpj: validatedData.cnpj }
          });
          
          if (existingCNPJ) {
            await prisma.$disconnect();
            return NextResponse.json(
              { error: 'Este CNPJ já está cadastrado' },
              { status: 400 }
            );
          }
        }
        
        await prisma.$disconnect();
      } catch (dbError) {
        console.error('Erro de banco de dados:', dbError);
        // Continuar sem banco de dados se houver erro
      }
    }
    
    // Gerar OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutos
    
    // Armazenar dados temporariamente
    const tempKey = `${validatedData.email}_${Date.now()}`;
    otpStorage.set(tempKey, {
      otp,
      expires,
      userData: validatedData
    });
    
    // Tentar enviar OTP por email (múltiplas opções)
    let emailSent = false;
    
    // Tentar SendGrid primeiro
    try {
      emailSent = await EmailService.sendOTP(
        validatedData.email,
        otp,
        validatedData.fullName
      );
    } catch (emailError) {
      console.error('Erro ao enviar email via SendGrid:', emailError);
    }
    
    // Se SendGrid falhou, tentar Resend
    if (!emailSent) {
      try {
        emailSent = await EmailService.sendOTPWithResend(
          validatedData.email,
          otp,
          validatedData.fullName
        );
      } catch (emailError) {
        console.error('Erro ao enviar email via Resend:', emailError);
      }
    }
    
    // Se ambos falharam, mostrar OTP no console
    if (!emailSent) {
      console.log(`\n🔑 ===== OTP GERADO =====`);
      console.log(`📧 Email: ${validatedData.email}`);
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
      debugUrl: !emailSent ? `/auth/debug-otp?email=${encodeURIComponent(validatedData.email)}&otp=${otp}` : null
    });
    
  } catch (error) {
    console.error('Erro no cadastro:', error);
    
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