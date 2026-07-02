-- Event Operations foundation: operational planning, suppliers, quotes, commitments, objectives and event budget lines.

CREATE TABLE IF NOT EXISTS event_operation_plans (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planning',
  owner_email text,
  summary text,
  due_date date,
  risk_level text NOT NULL DEFAULT 'normal',
  notes text,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS event_operation_plans_event_unique ON event_operation_plans(event_id);
CREATE INDEX IF NOT EXISTS event_operation_plans_status_idx ON event_operation_plans(status);
CREATE INDEX IF NOT EXISTS event_operation_plans_owner_idx ON event_operation_plans(owner_email);
CREATE INDEX IF NOT EXISTS event_operation_plans_due_date_idx ON event_operation_plans(due_date);

CREATE TABLE IF NOT EXISTS event_workstreams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'todo',
  owner_email text,
  due_date date,
  priority integer NOT NULL DEFAULT 3,
  order_index integer NOT NULL DEFAULT 0,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_workstreams_event_idx ON event_workstreams(event_id);
CREATE INDEX IF NOT EXISTS event_workstreams_status_idx ON event_workstreams(status);
CREATE INDEX IF NOT EXISTS event_workstreams_owner_idx ON event_workstreams(owner_email);
CREATE INDEX IF NOT EXISTS event_workstreams_due_date_idx ON event_workstreams(due_date);
CREATE INDEX IF NOT EXISTS event_workstreams_order_idx ON event_workstreams(event_id, order_index);

CREATE TABLE IF NOT EXISTS event_supplier_candidates (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workstream_id varchar REFERENCES event_workstreams(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  status text NOT NULL DEFAULT 'identified',
  rating integer,
  notes text,
  selected_at timestamp,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_supplier_candidates_event_idx ON event_supplier_candidates(event_id);
CREATE INDEX IF NOT EXISTS event_supplier_candidates_workstream_idx ON event_supplier_candidates(workstream_id);
CREATE INDEX IF NOT EXISTS event_supplier_candidates_status_idx ON event_supplier_candidates(status);
CREATE INDEX IF NOT EXISTS event_supplier_candidates_category_idx ON event_supplier_candidates(category);

CREATE TABLE IF NOT EXISTS event_supplier_quotes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  supplier_id varchar NOT NULL REFERENCES event_supplier_candidates(id) ON DELETE CASCADE,
  workstream_id varchar REFERENCES event_workstreams(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount_in_cents integer NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'requested',
  valid_until date,
  document_url text,
  terms text,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_supplier_quotes_event_idx ON event_supplier_quotes(event_id);
CREATE INDEX IF NOT EXISTS event_supplier_quotes_supplier_idx ON event_supplier_quotes(supplier_id);
CREATE INDEX IF NOT EXISTS event_supplier_quotes_workstream_idx ON event_supplier_quotes(workstream_id);
CREATE INDEX IF NOT EXISTS event_supplier_quotes_status_idx ON event_supplier_quotes(status);
CREATE INDEX IF NOT EXISTS event_supplier_quotes_valid_until_idx ON event_supplier_quotes(valid_until);

CREATE TABLE IF NOT EXISTS event_supplier_commitments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  supplier_id varchar NOT NULL REFERENCES event_supplier_candidates(id) ON DELETE RESTRICT,
  quote_id varchar REFERENCES event_supplier_quotes(id) ON DELETE SET NULL,
  workstream_id varchar REFERENCES event_workstreams(id) ON DELETE SET NULL,
  title text NOT NULL,
  committed_amount_in_cents integer NOT NULL DEFAULT 0,
  actual_amount_in_cents integer,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'planned',
  due_date date,
  paid_at timestamp,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_supplier_commitments_event_idx ON event_supplier_commitments(event_id);
CREATE INDEX IF NOT EXISTS event_supplier_commitments_supplier_idx ON event_supplier_commitments(supplier_id);
CREATE INDEX IF NOT EXISTS event_supplier_commitments_quote_idx ON event_supplier_commitments(quote_id);
CREATE INDEX IF NOT EXISTS event_supplier_commitments_workstream_idx ON event_supplier_commitments(workstream_id);
CREATE INDEX IF NOT EXISTS event_supplier_commitments_status_idx ON event_supplier_commitments(status);
CREATE INDEX IF NOT EXISTS event_supplier_commitments_due_date_idx ON event_supplier_commitments(due_date);

CREATE TABLE IF NOT EXISTS event_objectives (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  target_value integer NOT NULL DEFAULT 0,
  current_value integer NOT NULL DEFAULT 0,
  unit text,
  status text NOT NULL DEFAULT 'tracking',
  notes text,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_objectives_event_idx ON event_objectives(event_id);
CREATE INDEX IF NOT EXISTS event_objectives_type_idx ON event_objectives(type);
CREATE INDEX IF NOT EXISTS event_objectives_status_idx ON event_objectives(status);

CREATE TABLE IF NOT EXISTS event_budget_lines (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workstream_id varchar REFERENCES event_workstreams(id) ON DELETE SET NULL,
  supplier_id varchar REFERENCES event_supplier_candidates(id) ON DELETE SET NULL,
  quote_id varchar REFERENCES event_supplier_quotes(id) ON DELETE SET NULL,
  commitment_id varchar REFERENCES event_supplier_commitments(id) ON DELETE SET NULL,
  financial_budget_id varchar REFERENCES financial_budgets(id) ON DELETE SET NULL,
  financial_expense_id varchar REFERENCES financial_expenses(id) ON DELETE SET NULL,
  financial_revenue_id varchar REFERENCES financial_revenues(id) ON DELETE SET NULL,
  type text NOT NULL,
  label text NOT NULL,
  category text,
  planned_amount_in_cents integer NOT NULL DEFAULT 0,
  committed_amount_in_cents integer NOT NULL DEFAULT 0,
  actual_amount_in_cents integer NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by text,
  updated_by text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_budget_lines_event_idx ON event_budget_lines(event_id);
CREATE INDEX IF NOT EXISTS event_budget_lines_workstream_idx ON event_budget_lines(workstream_id);
CREATE INDEX IF NOT EXISTS event_budget_lines_supplier_idx ON event_budget_lines(supplier_id);
CREATE INDEX IF NOT EXISTS event_budget_lines_type_idx ON event_budget_lines(type);
CREATE INDEX IF NOT EXISTS event_budget_lines_status_idx ON event_budget_lines(status);
CREATE INDEX IF NOT EXISTS event_budget_lines_financial_budget_idx ON event_budget_lines(financial_budget_id);
