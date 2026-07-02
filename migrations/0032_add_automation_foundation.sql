-- Automation/workflow foundation
-- Versioned workflows, normalized events, runs and step logs.

CREATE TABLE IF NOT EXISTS automation_workflows (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  trigger_type text NOT NULL,
  draft_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_version integer NOT NULL DEFAULT 0,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_workflows_org_idx ON automation_workflows(organization_id);
CREATE INDEX IF NOT EXISTS automation_workflows_status_idx ON automation_workflows(status);
CREATE INDEX IF NOT EXISTS automation_workflows_trigger_idx ON automation_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS automation_workflows_updated_at_idx ON automation_workflows(updated_at);

CREATE TABLE IF NOT EXISTS automation_workflow_versions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id varchar NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  version integer NOT NULL,
  trigger_type text NOT NULL,
  definition_hash text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_by text,
  published_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_workflow_versions_workflow_version_unique ON automation_workflow_versions(workflow_id, version);
CREATE INDEX IF NOT EXISTS automation_workflow_versions_workflow_idx ON automation_workflow_versions(workflow_id);
CREATE INDEX IF NOT EXISTS automation_workflow_versions_trigger_idx ON automation_workflow_versions(trigger_type);
CREATE INDEX IF NOT EXISTS automation_workflow_versions_hash_idx ON automation_workflow_versions(definition_hash);

CREATE TABLE IF NOT EXISTS automation_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_id text NOT NULL,
  organization_id varchar REFERENCES organizations(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'internal',
  payload_hash text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_events_type_event_unique ON automation_events(event_type, event_id);
CREATE INDEX IF NOT EXISTS automation_events_org_idx ON automation_events(organization_id);
CREATE INDEX IF NOT EXISTS automation_events_type_idx ON automation_events(event_type);
CREATE INDEX IF NOT EXISTS automation_events_received_idx ON automation_events(received_at);
CREATE INDEX IF NOT EXISTS automation_events_payload_gin_idx ON automation_events USING gin(payload);

CREATE TABLE IF NOT EXISTS automation_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id varchar NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  workflow_version_id varchar NOT NULL REFERENCES automation_workflow_versions(id) ON DELETE CASCADE,
  automation_event_id varchar REFERENCES automation_events(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_attempt_at timestamp,
  started_at timestamp,
  finished_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_version_event_unique ON automation_runs(workflow_version_id, automation_event_id);
CREATE INDEX IF NOT EXISTS automation_runs_workflow_idx ON automation_runs(workflow_id);
CREATE INDEX IF NOT EXISTS automation_runs_version_idx ON automation_runs(workflow_version_id);
CREATE INDEX IF NOT EXISTS automation_runs_event_idx ON automation_runs(automation_event_id);
CREATE INDEX IF NOT EXISTS automation_runs_status_idx ON automation_runs(status);
CREATE INDEX IF NOT EXISTS automation_runs_next_attempt_idx ON automation_runs(next_attempt_at);
CREATE INDEX IF NOT EXISTS automation_runs_created_at_idx ON automation_runs(created_at);

CREATE TABLE IF NOT EXISTS automation_step_runs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id varchar NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  step_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamp,
  finished_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_step_runs_run_idx ON automation_step_runs(run_id);
CREATE INDEX IF NOT EXISTS automation_step_runs_step_idx ON automation_step_runs(step_id);
CREATE INDEX IF NOT EXISTS automation_step_runs_status_idx ON automation_step_runs(status);
CREATE INDEX IF NOT EXISTS automation_step_runs_created_at_idx ON automation_step_runs(created_at);
