import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy Next.js 16 pour gérer l'authentification et les requêtes HEAD
 * Vérifie les routes protégées et redirige vers /login si non authentifié
 */
export function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl;

  // Routes protégées (admin)
  if (pathname.startsWith('/admin') || pathname.startsWith('/onboarding')) {
    // TODO: Vérifier la session/cookie d'authentification
    // Pour l'instant, on laisse passer (à implémenter avec Authentik)

    // const session = request.cookies.get('session');
    // if (!session) {
    //   return NextResponse.redirect(new URL('/login', request.url));
    // }
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
