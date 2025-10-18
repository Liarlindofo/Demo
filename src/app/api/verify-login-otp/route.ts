import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Armazenar OTPs temporariamente (em produção, use Redis ou banco de dados)
const otpStorage = new Map<string, { otp: string; expires: number; userId: string }>();

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
    
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: tempData.userId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Limpar dados temporários
    otpStorage.delete(tempKey);
    
    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Erro na verificação do OTP de login:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}