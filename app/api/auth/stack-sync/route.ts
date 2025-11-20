import { NextResponse } from 'next/server';
import { syncStackAuthUser } from '@/lib/stack-auth-sync';
import { stackServerApp } from '@/stack';

export async function POST() {
  try {
    // Verificar se o usuário está autenticado no Stack Auth
    const stackUser = await stackServerApp.getUser({ or: 'return-null' });
    
    if (!stackUser) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    if (!stackUser.primaryEmail) {
      return NextResponse.json(
        { error: 'Conta sem email. Não é possível sincronizar usuário.' },
        { status: 400 }
      );
    }

    // Sincronizar usuário com banco de dados local
    let user;
    try {
      user = await syncStackAuthUser({
        id: stackUser.id,
        primaryEmail: stackUser.primaryEmail,
        displayName: stackUser.displayName,
        profileImageUrl: stackUser.profileImageUrl,
        primaryEmailVerified: stackUser.primaryEmailVerified 
          ? new Date() 
          : null,
      });
    } catch (e) {
      console.error('stack-sync prisma error:', e);
      return NextResponse.json({ error: 'Falha ao sincronizar usuário' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Erro ao sincronizar Stack Auth:', error);
    return NextResponse.json(
      { error: 'Erro ao sincronizar usuário' },
      { status: 500 }
    );
  }
}

