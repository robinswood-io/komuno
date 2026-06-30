import { createHash } from 'crypto';
import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  stripe_session_id: string | null;
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
      application_name: 'komuno-invite-accept',
    });
  }
  return pool;
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const inviteResult = await client.query<InvitationRow>(
      `SELECT i.id, i.organization_id, i.email, i.role, i.status, i.expires_at, i.stripe_session_id
         FROM organization_admin_invitations i
         JOIN organizations o ON o.id = i.organization_id
        WHERE o.slug = $1 AND i.token_hash = $2
        LIMIT 1
        FOR UPDATE`,
      [slug, hashToken(token)],
    );

    const invitation = inviteResult.rows[0];
    if (!invitation) {
      await client.query('ROLLBACK');
      return NextResponse.redirect(new URL(`/o/${slug}?invite=not-found`, _request.url), { status: 303 });
    }

    const isExpired = new Date(invitation.expires_at).getTime() < Date.now();
    if (invitation.status !== 'pending' || isExpired) {
      await client.query('ROLLBACK');
      return NextResponse.redirect(new URL(`/o/${slug}?invite=inactive`, _request.url), { status: 303 });
    }

    await client.query(
      `INSERT INTO organization_admins (organization_id, email, role, status, source, stripe_session_id)
       VALUES ($1, $2, $3, 'active', 'stripe_checkout_invitation', $4)
       ON CONFLICT (organization_id, email) DO UPDATE SET
         role = EXCLUDED.role,
         status = 'active',
         updated_at = NOW()`,
      [invitation.organization_id, invitation.email, invitation.role, invitation.stripe_session_id],
    );

    await client.query(
      `UPDATE organization_admin_invitations
          SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [invitation.id],
    );

    await client.query('COMMIT');
    return NextResponse.redirect(new URL(`/o/${slug}?invite=accepted`, _request.url), { status: 303 });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[Komuno] invitation accept failed', {
      slug,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return NextResponse.redirect(new URL(`/o/${slug}?invite=error`, _request.url), { status: 303 });
  } finally {
    client.release();
  }
}
