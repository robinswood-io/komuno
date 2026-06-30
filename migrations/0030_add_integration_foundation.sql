-- Socle générique d'intégrations externes Komuno
-- Objectif: comptes connectés, suivi de synchronisation, webhooks idempotents.

CREATE TABLE IF NOT EXISTS integration_accounts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  label text NOT NULL,
  organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'disconnected',
  auth_type text NOT NULL DEFAULT 'none',
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_fingerprint text,
  secret_encrypted boolean NOT NULL DEFAULT false,
  secret_encrypted_payload text,
  secret_encryption_key_id text,
  secret_encrypted_at timestamp,
  last_sync_at timestamp,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_accounts_provider_org_unique
  ON integration_accounts(provider, organization_id)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS integration_accounts_provider_idx ON integration_accounts(provider);
CREATE INDEX IF NOT EXISTS integration_accounts_status_idx ON integration_accounts(status);
CREATE INDEX IF NOT EXISTS integration_accounts_enabled_idx ON integration_accounts(enabled);

CREATE TABLE IF NOT EXISTS integration_sync_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id varchar REFERENCES integration_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  operation text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp NOT NULL DEFAULT NOW(),
  finished_at timestamp,
  pulled_count integer NOT NULL DEFAULT 0,
  pushed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS integration_sync_runs_account_idx ON integration_sync_runs(account_id);
CREATE INDEX IF NOT EXISTS integration_sync_runs_provider_idx ON integration_sync_runs(provider);
CREATE INDEX IF NOT EXISTS integration_sync_runs_status_idx ON integration_sync_runs(status);
CREATE INDEX IF NOT EXISTS integration_sync_runs_started_idx ON integration_sync_runs(started_at);

CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  account_id varchar REFERENCES integration_accounts(id) ON DELETE SET NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'received',
  processed_at timestamp,
  retry_count integer NOT NULL DEFAULT 0,
  error text,
  received_at timestamp NOT NULL DEFAULT NOW(),
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_webhook_events_provider_external_unique
  ON integration_webhook_events(provider, external_event_id);
CREATE INDEX IF NOT EXISTS integration_webhook_events_provider_idx ON integration_webhook_events(provider);
CREATE INDEX IF NOT EXISTS integration_webhook_events_status_idx ON integration_webhook_events(status);
CREATE INDEX IF NOT EXISTS integration_webhook_events_received_idx ON integration_webhook_events(received_at);
CREATE INDEX IF NOT EXISTS integration_webhook_events_payload_gin_idx ON integration_webhook_events USING gin(payload);
