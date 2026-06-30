-- Scoped organization admin onboarding for Komuno SaaS tenants.
-- This deliberately does not create rows in the global admins table.

CREATE TABLE IF NOT EXISTS organization_admins (
  organization_id varchar NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'stripe_checkout',
  stripe_session_id text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, email)
);

CREATE INDEX IF NOT EXISTS organization_admins_email_idx ON organization_admins(email);
CREATE INDEX IF NOT EXISTS organization_admins_status_idx ON organization_admins(status);

CREATE TABLE IF NOT EXISTS organization_admin_invitations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id varchar NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text UNIQUE,
  expires_at timestamp NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_admin_invitations_org_idx ON organization_admin_invitations(organization_id);
CREATE INDEX IF NOT EXISTS organization_admin_invitations_email_idx ON organization_admin_invitations(email);
CREATE INDEX IF NOT EXISTS organization_admin_invitations_status_idx ON organization_admin_invitations(status);
