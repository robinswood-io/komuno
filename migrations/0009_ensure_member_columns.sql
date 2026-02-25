-- Migration 0009: Ajouter colonnes membres manquantes
-- Utilise un bloc DO avec gestion d'exception pour éviter le crash si
-- le user DB n'est pas owner de la table (cas Neon avec user restreint).
-- L'app démarrera ; les colonnes seront ajoutées manuellement via console Neon si nécessaire.

DO $$
BEGIN
  -- subscription_end_date (migration 0001)
  ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
  -- department, city, postal_code, sector (migration 0002)
  ALTER TABLE members ADD COLUMN IF NOT EXISTS department TEXT;
  ALTER TABLE members ADD COLUMN IF NOT EXISTS city TEXT;
  ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
  ALTER TABLE members ADD COLUMN IF NOT EXISTS sector TEXT;
  -- first_contact_date, meeting_date (migration 0004)
  ALTER TABLE members ADD COLUMN IF NOT EXISTS first_contact_date DATE;
  ALTER TABLE members ADD COLUMN IF NOT EXISTS meeting_date DATE;
  -- Index
  CREATE INDEX IF NOT EXISTS members_department_idx ON members(department);
  CREATE INDEX IF NOT EXISTS members_city_idx ON members(city);
  CREATE INDEX IF NOT EXISTS members_postal_code_idx ON members(postal_code);
  CREATE INDEX IF NOT EXISTS members_sector_idx ON members(sector);
  RAISE NOTICE 'Migration 0009: colonnes membres ajoutées avec succès';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Migration 0009: permission insuffisante (ALTER TABLE members) - colonnes à ajouter manuellement via console Neon';
  WHEN OTHERS THEN
    RAISE NOTICE 'Migration 0009: erreur inattendue: % - %', SQLSTATE, SQLERRM;
END $$;
