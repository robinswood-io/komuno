-- Migration 0026: Durcissement Formulaires v2
-- Versioning des formulaires, snapshot des réponses, expiration, consentement RGPD et rétention.

ALTER TABLE survey_forms
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS expires_at timestamp,
  ADD COLUMN IF NOT EXISTS require_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS retention_days integer;

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS form_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS form_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consent_accepted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS survey_forms_expires_at_idx ON survey_forms(expires_at);
CREATE INDEX IF NOT EXISTS survey_forms_status_expires_idx ON survey_forms(status, expires_at);
CREATE INDEX IF NOT EXISTS survey_responses_form_version_idx ON survey_responses(form_id, form_version);
CREATE INDEX IF NOT EXISTS survey_responses_form_snapshot_gin_idx ON survey_responses USING gin (form_snapshot);
