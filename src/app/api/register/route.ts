import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { registerSchema, type RegisterFormData } from '@/lib/validation';
import { EmailService } from '@/lib/sendgrid';

const prisma = new PrismaClient();

// Armazenar OTPs temporariamente (em produção, use Redis ou banco de dados)
const otpStorage = new Map<string, { otp: string; expires: number; userData: RegisterFormData }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados do formulário
    const validatedData = registerSchema.parse(body);
    
    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
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
        return NextResponse.json(
          { error: 'Este CNPJ já está cadastrado' },
          { status: 400 }
        );
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
    
    // Enviar OTP por email
    const emailSent = await EmailService.sendOTP(
      validatedData.email,
      otp,
      validatedData.fullName
    );
    
    if (!emailSent) {
      return NextResponse.json(
        { error: 'Erro ao enviar email de verificação' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Código de verificação enviado para seu email',
      tempKey // Usado para verificar o OTP
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