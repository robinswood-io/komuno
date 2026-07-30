import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function normalizeTenantSlug(slug: string | undefined | null): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,80}$/.test(normalized)) return null;
  return normalized;
}

function isSafeTenantRedirectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function parseTenantRedirects(raw = process.env.KOMUNO_TENANT_REDIRECTS || ''): Record<string, string> {
  if (!raw.trim()) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, entry) => {
        const [slug, ...urlParts] = entry.split('=');
        const url = urlParts.join('=').trim();
        const normalizedSlug = normalizeTenantSlug(slug);
        if (normalizedSlug && isSafeTenantRedirectUrl(url)) acc[normalizedSlug] = url;
        return acc;
      }, {});
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [slug, value]) => {
    const normalizedSlug = normalizeTenantSlug(slug);
    if (normalizedSlug && typeof value === 'string' && isSafeTenantRedirectUrl(value)) {
      acc[normalizedSlug] = value;
    }
    return acc;
  }, {});
}

function resolveTenantRedirect(pathname: string): string | null {
  const match = pathname.match(/^\/o\/([^/]+)\/?$/);
  const slug = normalizeTenantSlug(match?.[1]);
  if (!slug) return null;
  return parseTenantRedirects()[slug] || null;
}

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

  const tenantRedirect = resolveTenantRedirect(pathname);
  if (tenantRedirect) {
    return NextResponse.redirect(tenantRedirect, 307);
  }

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
