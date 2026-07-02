-- Restore UI workflow tables used by legacy/optional UI modules.
-- This migration is intentionally idempotent because some historical instances
-- already have member_statuses/event_sponsorships from older baselines while
-- others do not.

BEGIN;

CREATE TABLE IF NOT EXISTS member_statuses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'gray',
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS member_statuses_category_idx ON member_statuses(category);
CREATE INDEX IF NOT EXISTS member_statuses_is_active_idx ON member_statuses(is_active);
CREATE INDEX IF NOT EXISTS member_statuses_display_order_idx ON member_statuses(display_order);

INSERT INTO member_statuses (code, label, category, color, is_system, display_order, description) VALUES
('active', 'Actif', 'member', 'green', true, 1, 'Membre actif'),
('proposed', 'Proposé', 'member', 'orange', true, 2, 'Membre proposé en attente de validation'),
('inactive', 'Inactif', 'member', 'gray', true, 3, 'Membre inactif'),
('2027', 'Cible 2027', 'prospect', 'purple', false, 10, 'Prospect ciblé pour 2027'),
('refused', 'Refusé', 'prospect', 'red', false, 11, 'Prospect ayant refusé'),
('to_contact', 'À contacter', 'prospect', 'yellow', false, 12, 'Prospect à contacter'),
('meeting_scheduled', 'RDV prévu', 'prospect', 'blue', false, 13, 'Rendez-vous planifié'),
('interest_relaunch', 'Intérêt - à relancer', 'prospect', 'cyan', false, 14, 'Intéressé, à relancer')
ON CONFLICT (code) DO NOTHING;

UPDATE members SET status = 'refused' WHERE status = 'Refusé';
UPDATE members SET status = 'to_contact' WHERE status = 'A contacter';
UPDATE members SET status = 'meeting_scheduled' WHERE status = 'RDV prévu';
UPDATE members SET status = 'interest_relaunch' WHERE status = 'Intérêt - à relancer';

CREATE TABLE IF NOT EXISTS tool_categories (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#10b981',
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tool_categories_order_idx ON tool_categories("order");
CREATE INDEX IF NOT EXISTS tool_categories_active_idx ON tool_categories(is_active);

CREATE TABLE IF NOT EXISTS tools (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id VARCHAR REFERENCES tool_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  price TEXT,
  link TEXT,
  tags TEXT[],
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS tools_category_idx ON tools(category_id);
CREATE INDEX IF NOT EXISTS tools_featured_idx ON tools(is_featured);
CREATE INDEX IF NOT EXISTS tools_active_idx ON tools(is_active);
CREATE INDEX IF NOT EXISTS tools_order_idx ON tools("order");

COMMIT;
