-- Migration corrective: Garantir que toutes les colonnes membres existent
-- Idempotente (ADD COLUMN IF NOT EXISTS)
-- Sans check de permissions qui masquait l'échec dans 0008

BEGIN;

-- Colonnes migration 0001
ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

-- Colonnes migration 0002
ALTER TABLE members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sector TEXT;

-- Colonnes migration 0004
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_contact_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS meeting_date DATE;

-- Index si absents
CREATE INDEX IF NOT EXISTS members_department_idx ON members(department);
CREATE INDEX IF NOT EXISTS members_city_idx ON members(city);
CREATE INDEX IF NOT EXISTS members_postal_code_idx ON members(postal_code);
CREATE INDEX IF NOT EXISTS members_sector_idx ON members(sector);

COMMIT;
