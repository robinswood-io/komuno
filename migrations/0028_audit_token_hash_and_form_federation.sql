-- 0028 - Audit métier, hash des jetons de fédération, syndication formulaires

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash/fingerprint des jetons de fédération.
ALTER TABLE organization_relations
  ADD COLUMN IF NOT EXISTS federation_token_hash text,
  ADD COLUMN IF NOT EXISTS federation_token_fingerprint text,
  ADD COLUMN IF NOT EXISTS federation_token_rotated_at timestamp;

-- Backfill non destructif : le jeton clair historique reste temporairement nécessaire pour
-- les appels sortants tant qu'il n'a pas été régénéré. Le hash permet déjà l'ingest entrant.
UPDATE organization_relations
SET
  federation_token_hash = encode(digest(federation_token, 'sha256'), 'hex'),
  federation_token_fingerprint = upper(substr(encode(digest(federation_token, 'sha256'), 'hex'), 1, 12)),
  federation_token_rotated_at = COALESCE(federation_token_rotated_at, NOW())
WHERE federation_token IS NOT NULL
  AND federation_token_hash IS NULL;

CREATE INDEX IF NOT EXISTS organization_relations_token_hash_idx
  ON organization_relations (federation_token_hash)
  WHERE federation_token_hash IS NOT NULL;

-- Journal d'audit métier, append-only côté application.
CREATE TABLE IF NOT EXISTS business_audit_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  relation_id varchar REFERENCES organization_relations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_audit_logs_action_idx ON business_audit_logs(action);
CREATE INDEX IF NOT EXISTS business_audit_logs_entity_idx ON business_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS business_audit_logs_actor_idx ON business_audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS business_audit_logs_organization_idx ON business_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS business_audit_logs_relation_idx ON business_audit_logs(relation_id);
CREATE INDEX IF NOT EXISTS business_audit_logs_created_at_idx ON business_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS business_audit_logs_metadata_gin_idx ON business_audit_logs USING gin(metadata);

-- Syndications de formulaires/sondages : mêmes garanties que les événements.
CREATE TABLE IF NOT EXISTS survey_form_syndications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id varchar NOT NULL REFERENCES survey_forms(id) ON DELETE CASCADE,
  source_organization_id varchar NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_organization_id varchar NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  include_responses boolean NOT NULL DEFAULT false,
  collect_responses_locally boolean NOT NULL DEFAULT true,
  local_title_override text,
  local_description_override text,
  last_synced_at timestamp,
  created_by text,
  reviewed_by text,
  reviewed_at timestamp,
  target_instance_url text,
  remote_form_id varchar,
  remote_syndication_id varchar,
  sync_status text NOT NULL DEFAULT 'local',
  sync_error text,
  last_sync_attempt_at timestamp,
  sync_attempts integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT survey_form_syndications_unique UNIQUE (form_id, source_organization_id, target_organization_id)
);

CREATE INDEX IF NOT EXISTS survey_form_syndications_form_idx ON survey_form_syndications(form_id);
CREATE INDEX IF NOT EXISTS survey_form_syndications_source_idx ON survey_form_syndications(source_organization_id);
CREATE INDEX IF NOT EXISTS survey_form_syndications_target_idx ON survey_form_syndications(target_organization_id);
CREATE INDEX IF NOT EXISTS survey_form_syndications_direction_idx ON survey_form_syndications(direction);
CREATE INDEX IF NOT EXISTS survey_form_syndications_status_idx ON survey_form_syndications(status);
CREATE INDEX IF NOT EXISTS survey_form_syndications_sync_status_idx ON survey_form_syndications(sync_status);
CREATE INDEX IF NOT EXISTS survey_form_syndications_remote_form_idx ON survey_form_syndications(remote_form_id);
CREATE INDEX IF NOT EXISTS survey_form_syndications_remote_syndication_idx ON survey_form_syndications(remote_syndication_id);

-- Consolidation RGPD-friendly : agrégats par section/instance, pas de réponses brutes.
CREATE TABLE IF NOT EXISTS survey_form_response_summaries (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  syndication_id varchar REFERENCES survey_form_syndications(id) ON DELETE SET NULL,
  form_id varchar REFERENCES survey_forms(id) ON DELETE CASCADE,
  remote_form_id varchar,
  source_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  target_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  source_instance_url text,
  response_count integer NOT NULL DEFAULT 0,
  last_response_at timestamp,
  responses_by_day jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_summaries jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT NOW(),
  updated_at timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT survey_form_response_summaries_unique UNIQUE (source_instance_url, remote_form_id, target_organization_id)
);

CREATE INDEX IF NOT EXISTS survey_form_response_summaries_syndication_idx ON survey_form_response_summaries(syndication_id);
CREATE INDEX IF NOT EXISTS survey_form_response_summaries_form_idx ON survey_form_response_summaries(form_id);
CREATE INDEX IF NOT EXISTS survey_form_response_summaries_source_idx ON survey_form_response_summaries(source_organization_id);
CREATE INDEX IF NOT EXISTS survey_form_response_summaries_target_idx ON survey_form_response_summaries(target_organization_id);
CREATE INDEX IF NOT EXISTS survey_form_response_summaries_updated_at_idx ON survey_form_response_summaries(updated_at DESC);
CREATE INDEX IF NOT EXISTS survey_form_response_summaries_question_summaries_gin_idx ON survey_form_response_summaries USING gin(question_summaries);
