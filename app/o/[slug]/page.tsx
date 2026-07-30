import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Organization = {
  id: string;
  slug: string;
  name: string;
  type: string;
  domain: string | null;
  instance_url: string | null;
  is_active: boolean;
  created_at: string;
};

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to load organization tenant pages');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: 'komuno-tenant-page',
    });
  }
  return pool;
}

export function parseTenantRedirects(raw = process.env.KOMUNO_TENANT_REDIRECTS || ''): Record<string, string> {
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
        const normalizedSlug = normalizeSlug(slug);
        if (normalizedSlug && isSafeTenantRedirectUrl(url)) acc[normalizedSlug] = url;
        return acc;
      }, {});
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, string>>((acc, [slug, value]) => {
    const normalizedSlug = normalizeSlug(slug);
    if (normalizedSlug && typeof value === 'string' && isSafeTenantRedirectUrl(value)) {
      acc[normalizedSlug] = value;
    }
    return acc;
  }, {});
}

export function normalizeSlug(slug: string | undefined | null): string | null {
  if (!slug) return null;
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,80}$/.test(normalized)) return null;
  return normalized;
}

export function isSafeTenantRedirectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function resolveDedicatedTenantRedirect(slug: string, redirects = parseTenantRedirects()): string | null {
  const normalizedSlug = normalizeSlug(slug);
  return normalizedSlug ? redirects[normalizedSlug] || null : null;
}

async function loadOrganization(slug: string): Promise<Organization | null> {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return null;

  const result = await getPool().query<Organization>(
    `SELECT id, slug, name, type, domain, instance_url, is_active, created_at
     FROM organizations
     WHERE slug = $1 AND is_active = true
     LIMIT 1`,
    [normalizedSlug],
  );
  return result.rows[0] || null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const redirectUrl = resolveDedicatedTenantRedirect(slug);
  if (redirectUrl) {
    return {
      title: 'Redirection espace Komuno',
      description: 'Cet espace Komuno dispose d’une instance dédiée.',
      robots: { index: false, follow: false },
    };
  }

  const organization = await loadOrganization(slug).catch(() => null);
  if (organization) {
    return {
      title: `${organization.name} — Komuno`,
      description: `Espace Komuno de ${organization.name}.`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: 'Organisation introuvable — Komuno',
    description: 'Aucun espace Komuno actif ne correspond à cette adresse.',
    robots: { index: false, follow: false },
  };
}

export default async function OrganizationTenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const redirectUrl = resolveDedicatedTenantRedirect(slug);
  if (redirectUrl) redirect(redirectUrl);

  const organization = await loadOrganization(slug).catch((error) => {
    console.error('[Komuno] tenant organization lookup failed', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return null;
  });

  if (!organization) notFound();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <section className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Espace Komuno</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 md:text-6xl">{organization.name}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
          Votre organisation est créée dans Komuno. L’accès administrateur et l’import des données peuvent maintenant être initialisés.
        </p>

        <div className="mt-8 grid gap-4 rounded-2xl bg-gray-50 p-5 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <p className="font-bold text-gray-950">Identifiant</p>
            <p>{organization.slug}</p>
          </div>
          <div>
            <p className="font-bold text-gray-950">Statut</p>
            <p>{organization.is_active ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="font-bold text-gray-950">Type</p>
            <p>{organization.type}</p>
          </div>
          <div>
            <p className="font-bold text-gray-950">Créée le</p>
            <p>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(organization.created_at))}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="/login" className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90">
            Se connecter
          </a>
          <a href="/admin" className="inline-flex rounded-full border border-gray-300 px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-100">
            Administration
          </a>
        </div>
      </section>
    </main>
  );
}
