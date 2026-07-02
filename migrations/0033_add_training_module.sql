-- Training module foundation: programs, sessions, interests and sync runs.

CREATE TABLE IF NOT EXISTS training_programs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  origin_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  source_instance_url text,
  source_training_id varchar,
  slug varchar(140) NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  audience text,
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  federation_visibility text NOT NULL DEFAULT 'local',
  federation_status text NOT NULL DEFAULT 'local_only',
  version integer NOT NULL DEFAULT 1,
  is_federated_copy boolean NOT NULL DEFAULT false,
  canonical_training_id varchar,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS training_programs_slug_org_unique ON training_programs(slug, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS training_programs_source_unique ON training_programs(source_instance_url, source_training_id) WHERE source_instance_url IS NOT NULL AND source_training_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS training_programs_org_idx ON training_programs(organization_id);
CREATE INDEX IF NOT EXISTS training_programs_status_idx ON training_programs(status);
CREATE INDEX IF NOT EXISTS training_programs_federation_visibility_idx ON training_programs(federation_visibility);
CREATE INDEX IF NOT EXISTS training_programs_federation_status_idx ON training_programs(federation_status);
CREATE INDEX IF NOT EXISTS training_programs_updated_at_idx ON training_programs(updated_at);

CREATE TABLE IF NOT EXISTS training_sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id varchar NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  source_session_id varchar,
  starts_at timestamp NOT NULL,
  ends_at timestamp,
  location_name text,
  location_address text,
  city text,
  capacity integer,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS training_sessions_source_unique ON training_sessions(training_id, source_session_id) WHERE source_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS training_sessions_training_idx ON training_sessions(training_id);
CREATE INDEX IF NOT EXISTS training_sessions_starts_at_idx ON training_sessions(starts_at);
CREATE INDEX IF NOT EXISTS training_sessions_status_idx ON training_sessions(status);
CREATE INDEX IF NOT EXISTS training_sessions_city_idx ON training_sessions(city);

CREATE TABLE IF NOT EXISTS training_interests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id varchar NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  session_id varchar REFERENCES training_sessions(id) ON DELETE SET NULL,
  respondent_name text NOT NULL,
  respondent_email text NOT NULL,
  company text,
  phone text,
  member_email text REFERENCES members(email) ON DELETE SET NULL,
  source_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  source_instance_url text,
  source_interest_id varchar,
  consent_accepted boolean NOT NULL DEFAULT false,
  message text,
  status text NOT NULL DEFAULT 'new',
  synced_to_region_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS training_interests_unique_email_session ON training_interests(training_id, session_id, respondent_email, source_organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS training_interests_source_unique ON training_interests(source_instance_url, source_interest_id) WHERE source_instance_url IS NOT NULL AND source_interest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS training_interests_training_idx ON training_interests(training_id);
CREATE INDEX IF NOT EXISTS training_interests_session_idx ON training_interests(session_id);
CREATE INDEX IF NOT EXISTS training_interests_email_idx ON training_interests(respondent_email);
CREATE INDEX IF NOT EXISTS training_interests_source_org_idx ON training_interests(source_organization_id);
CREATE INDEX IF NOT EXISTS training_interests_status_idx ON training_interests(status);
CREATE INDEX IF NOT EXISTS training_interests_created_at_idx ON training_interests(created_at);

CREATE TABLE IF NOT EXISTS training_sync_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  target_organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  relation_id varchar REFERENCES organization_relations(id) ON DELETE SET NULL,
  pushed_count integer NOT NULL DEFAULT 0,
  pulled_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamp NOT NULL DEFAULT now(),
  finished_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_sync_runs_direction_idx ON training_sync_runs(direction);
CREATE INDEX IF NOT EXISTS training_sync_runs_status_idx ON training_sync_runs(status);
CREATE INDEX IF NOT EXISTS training_sync_runs_source_idx ON training_sync_runs(source_organization_id);
CREATE INDEX IF NOT EXISTS training_sync_runs_target_idx ON training_sync_runs(target_organization_id);
CREATE INDEX IF NOT EXISTS training_sync_runs_started_at_idx ON training_sync_runs(started_at);
