-- Migration 0025: Module Formulaires / Sondages
-- Permet de créer des formulaires publics, collecter des réponses structurées
-- et produire des tableaux / agrégations graphiques côté admin.

CREATE TABLE IF NOT EXISTS survey_forms (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(120) NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  collect_respondent_info boolean NOT NULL DEFAULT false,
  allow_multiple_submissions boolean NOT NULL DEFAULT true,
  success_message text,
  created_by text,
  published_at timestamp,
  closed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id varchar NOT NULL REFERENCES survey_forms(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id varchar NOT NULL REFERENCES survey_forms(id) ON DELETE CASCADE,
  respondent_name text,
  respondent_email text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS survey_forms_status_idx ON survey_forms(status);
CREATE INDEX IF NOT EXISTS survey_forms_slug_idx ON survey_forms(slug);
CREATE INDEX IF NOT EXISTS survey_forms_created_at_idx ON survey_forms(created_at);
CREATE INDEX IF NOT EXISTS survey_questions_form_idx ON survey_questions(form_id);
CREATE INDEX IF NOT EXISTS survey_questions_form_order_idx ON survey_questions(form_id, order_index);
CREATE INDEX IF NOT EXISTS survey_responses_form_idx ON survey_responses(form_id);
CREATE INDEX IF NOT EXISTS survey_responses_submitted_at_idx ON survey_responses(submitted_at);
CREATE INDEX IF NOT EXISTS survey_responses_answers_gin_idx ON survey_responses USING gin (answers);

INSERT INTO feature_config (feature_key, enabled, updated_by, updated_at)
VALUES ('forms', true, 'migration-0025', now())
ON CONFLICT (feature_key) DO NOTHING;
