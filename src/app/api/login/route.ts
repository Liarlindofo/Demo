import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@/generated/prisma';
import { loginSchema } from '@/lib/validation';
import { EmailService } from '@/lib/sendgrid';

const prisma = new PrismaClient();

// Armazenar OTPs temporariamente (em produção, use Redis ou banco de dados)
const otpStorage = new Map<string, { otp: string; expires: number; userId: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar dados do formulário
    const validatedData = loginSchema.parse(body);
    
    // Buscar usuário por email ou username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.email }
        ]
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
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
    
    // Enviar OTP por email
    const emailSent = await EmailService.sendOTP(
      user.email,
      otp,
      user.fullName || user.username
    );
    
    if (!emailSent) {
      return NextResponse.json(
        { error: 'Erro ao enviar código de verificação' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Código de verificação enviado para seu email',
      tempKey // Usado para verificar o OTP
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
    const user = await prisma.user.findUnique({
      where: { id: tempData.userId }
    });
    
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
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
