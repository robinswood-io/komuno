import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy Next.js 16 pour gérer l'authentification et les requêtes HEAD
 * Vérifie les routes protégées et redirige vers /login si non authentifié
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes protégées (admin / onboarding): ne pas exposer les pages sans cookie de session.
  if (pathname.startsWith('/admin') || pathname.startsWith('/onboarding')) {
    const hasSessionCookie = request.cookies.has('connect.sid') || request.cookies.has('session');
    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Gestion des requêtes HEAD pour éviter les 502
  // Next.js en mode dev peut avoir des problèmes avec HEAD requests
  if (request.method === 'HEAD') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
