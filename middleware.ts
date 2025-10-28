import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const devAuthBypass = process.env.DEV_AUTH_BYPASS === 'true';

  // Modo bypass - não fazer nada
  if (devAuthBypass) {
    return NextResponse.next();
  }

  // Limpar parâmetros de URL após autenticação
  // Isso remove os parâmetros visíveis como ?code=xxx e ?after_auth_return_to=...
  if (pathname.startsWith('/handler') || pathname.startsWith('/dashboard')) {
    const code = searchParams.get('code');
    const afterAuthReturnTo = searchParams.get('after_auth_return_to');

    // Se há parâmetros de callback, limpar da URL
    if (code || afterAuthReturnTo) {
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
    '/auth/:path*',
  ],
};

