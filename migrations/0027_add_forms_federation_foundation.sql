-- Migration 0027: Fondations fédération pour les formulaires
-- Prépare la syndication future des formulaires section ↔ région sans activer de copie automatique.

ALTER TABLE survey_forms
  ADD COLUMN IF NOT EXISTS organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_form_id varchar,
  ADD COLUMN IF NOT EXISTS source_instance_url text,
  ADD COLUMN IF NOT EXISTS federation_visibility text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS federation_status text NOT NULL DEFAULT 'local_only',
  ADD COLUMN IF NOT EXISTS is_federated_copy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canonical_form_id varchar;

CREATE INDEX IF NOT EXISTS survey_forms_organization_idx ON survey_forms(organization_id);
CREATE INDEX IF NOT EXISTS survey_forms_origin_organization_idx ON survey_forms(origin_organization_id);
CREATE INDEX IF NOT EXISTS survey_forms_federation_visibility_idx ON survey_forms(federation_visibility);
CREATE INDEX IF NOT EXISTS survey_forms_federation_status_idx ON survey_forms(federation_status);
CREATE UNIQUE INDEX IF NOT EXISTS survey_forms_source_instance_form_unique_idx ON survey_forms(source_instance_url, source_form_id) WHERE source_instance_url IS NOT NULL AND source_form_id IS NOT NULL;
