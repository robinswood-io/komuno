-- Migration 0009: Ajouter colonnes membres manquantes
-- Requiert DATABASE_URL_SUPERUSER sur le serveur (user postgres avec droits ALTER TABLE)

ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_contact_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS meeting_date DATE;

CREATE INDEX IF NOT EXISTS members_department_idx ON members(department);
CREATE INDEX IF NOT EXISTS members_city_idx ON members(city);
CREATE INDEX IF NOT EXISTS members_postal_code_idx ON members(postal_code);
CREATE INDEX IF NOT EXISTS members_sector_idx ON members(sector);
