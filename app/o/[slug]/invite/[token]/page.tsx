import { createHash } from 'crypto';
import { notFound } from 'next/navigation';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  organization_slug: string;
  organization_name: string;
};

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: 'komuno-invite-page',
    });
  }
  return pool;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function loadInvitation(slug: string, token: string): Promise<Invitation | null> {
  const result = await getPool().query<Invitation>(
    `SELECT i.id, i.email, i.role, i.status, i.expires_at,
            o.slug AS organization_slug, o.name AS organization_name
       FROM organization_admin_invitations i
       JOIN organizations o ON o.id = i.organization_id
      WHERE o.slug = $1 AND i.token_hash = $2
      LIMIT 1`,
    [slug, hashToken(token)],
  );
  return result.rows[0] || null;
}

export default async function OrganizationInvitePage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const invitation = await loadInvitation(slug, token).catch((error) => {
    console.error('[Komuno] invitation lookup failed', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return null;
  });

  if (!invitation) notFound();

  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt.getTime() < Date.now();
  const isPending = invitation.status === 'pending' && !isExpired;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <section className="mx-auto max-w-3xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Invitation Komuno</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950">{invitation.organization_name}</h1>
        <p className="mt-5 text-lg leading-relaxed text-gray-600">
          Invitation administrateur scoped pour <strong>{invitation.email}</strong>.
        </p>

        <div className="mt-8 rounded-2xl bg-gray-50 p-5 text-sm text-gray-700">
          <p><strong>Rôle :</strong> {invitation.role}</p>
          <p><strong>Statut :</strong> {isExpired && invitation.status === 'pending' ? 'expired' : invitation.status}</p>
          <p><strong>Expiration :</strong> {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(expiresAt)}</p>
        </div>

        {isPending ? (
          <form method="POST" action={`/o/${slug}/invite/${token}/accept`} className="mt-8">
            <button className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90" type="submit">
              Activer mon accès organisation
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Cette invitation n’est plus activable. Contactez l’équipe Komuno pour recevoir un nouveau lien.
          </p>
        )}
      </section>
    </main>
  );
}
