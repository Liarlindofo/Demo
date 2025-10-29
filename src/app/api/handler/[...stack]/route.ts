import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { syncStackAuthUser } from '@/lib/stack-auth-sync';

/**
 * Handler do Stack Auth como API Route
 * Este é o endpoint que o Stack Auth usa para processar callbacks de autenticação
 * 
 * O Stack Auth redireciona para este endpoint após autenticação bem-sucedida.
 * Este handler processa o callback e sincroniza o usuário com o banco de dados local.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  try {
    // Processar o handler do Stack Auth primeiro
    // Isso processa o callback de autenticação e configura os cookies de sessão
    const response = await stackServerApp.handler(request);
    
    // Após processar o handler, verificar se há um usuário autenticado
    // e sincronizar com o banco de dados local (em background, não bloqueia a resposta)
    stackServerApp.getUser(request).then(async (user) => {
      if (user) {
        try {
          await syncStackAuthUser({
            id: user.id,
            primaryEmail: user.primaryEmail,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
            primaryEmailVerified: user.primaryEmailVerified 
              ? new Date() 
              : null,
          });
        } catch (syncError) {
          // Log do erro mas não falhar o handler
          console.error('Erro ao sincronizar usuário:', syncError);
        }
      }
    }).catch((err) => {
      // Ignorar erros de sincronização em background
      console.error('Erro ao verificar usuário para sincronização:', err);
    });
    
    // Retornar a resposta do handler imediatamente
    return response;
  } catch (error) {
    console.error('Erro no handler do Stack Auth:', error);
    // Em caso de erro, ainda tentar retornar algo útil
    return NextResponse.json(
      { error: 'Erro ao processar autenticação' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  // O Stack Auth também pode fazer POST requests para o handler
  return GET(request, { params });
}

