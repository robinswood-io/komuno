-- Migration corrective: Ajouter toutes les colonnes manquantes de la table members
-- Cette migration est idempotente (safe à réexécuter)

BEGIN;

-- Colonnes ajoutées dans migration 0001
ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

-- Colonnes ajoutées dans migration 0002
ALTER TABLE members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sector TEXT;

-- Colonnes ajoutées dans migration 0004
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_contact_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS meeting_date DATE;

-- Créer les index s'ils n'existent pas
CREATE INDEX IF NOT EXISTS members_department_idx ON members(department);
CREATE INDEX IF NOT EXISTS members_city_idx ON members(city);
CREATE INDEX IF NOT EXISTS members_postal_code_idx ON members(postal_code);
CREATE INDEX IF NOT EXISTS members_sector_idx ON members(sector);

COMMIT;

-- Log de fin
DO $$
BEGIN
  RAISE NOTICE 'Migration 0007_fix_missing_columns completed successfully';
END $$;
