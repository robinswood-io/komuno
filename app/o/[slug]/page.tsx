import { notFound } from 'next/navigation';
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

async function loadOrganization(slug: string): Promise<Organization | null> {
  const result = await getPool().query<Organization>(
    `SELECT id, slug, name, type, domain, instance_url, is_active, created_at
     FROM organizations
     WHERE slug = $1 AND is_active = true
     LIMIT 1`,
    [slug],
  );
  return result.rows[0] || null;
}

export default async function OrganizationTenantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
