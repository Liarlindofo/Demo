import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Limpar parâmetros de URL após autenticação
  // Isso remove os parâmetros visíveis como ?code=xxx e ?after_auth_return_to=...
  if (pathname.startsWith('/handler')) {
    const code = searchParams.get('code');
    const afterAuthReturnTo = searchParams.get('after_auth_return_to');

    // Se há parâmetros de callback, limpar da URL e manter apenas o handler
    if (code || afterAuthReturnTo) {
      const url = request.nextUrl.clone();
      url.search = '';
      // Não redirecionar aqui, deixar o handler processar
      return NextResponse.next();
    }
  }

  // Limpar parâmetros do dashboard
  if (pathname.startsWith('/dashboard')) {
    const code = searchParams.get('code');
    if (code) {
      const url = request.nextUrl.clone();
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/handler/:path*',
    '/dashboard/:path*',
  ],
};

