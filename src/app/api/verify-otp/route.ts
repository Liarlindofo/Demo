import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { type RegisterFormData } from '@/lib/validation';
import { EmailService } from '@/lib/sendgrid';

const prisma = new PrismaClient();

// Armazenar OTPs temporariamente (em produção, use Redis ou banco de dados)
const otpStorage = new Map<string, { otp: string; expires: number; userData: RegisterFormData }>();

export async function POST(request: NextRequest) {
  try {
    const { tempKey, otp } = await request.json();
    
    if (!tempKey || !otp) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }
    
    // Buscar dados temporários
    const tempData = otpStorage.get(tempKey);
    
    if (!tempData) {
      return NextResponse.json(
        { error: 'Código de verificação expirado ou inválido' },
        { status: 400 }
      );
    }
    
    // Verificar se o OTP expirou
    if (Date.now() > tempData.expires) {
      otpStorage.delete(tempKey);
      return NextResponse.json(
        { error: 'Código de verificação expirado' },
        { status: 400 }
      );
    }
    
    // Verificar se o OTP está correto
    if (tempData.otp !== otp) {
      return NextResponse.json(
        { error: 'Código de verificação incorreto' },
        { status: 400 }
      );
    }
    
    // Criptografar senha
    const hashedPassword = await bcrypt.hash(tempData.userData.password, 12);
    
    // Criar usuário no banco de dados
    const user = await prisma.user.create({
      data: {
        email: tempData.userData.email,
        username: tempData.userData.email.split('@')[0], // Usar parte do email como username
        password: hashedPassword,
        fullName: tempData.userData.fullName,
        cnpj: tempData.userData.cnpj,
        birthDate: new Date(tempData.userData.birthDate),
        isAdmin: false
      }
    });
    
    // Limpar dados temporários
    otpStorage.delete(tempKey);
    
    // Enviar email de boas-vindas
    await EmailService.sendWelcomeEmail(user.email, user.fullName || user.username);
    
    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Erro na verificação do OTP:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}