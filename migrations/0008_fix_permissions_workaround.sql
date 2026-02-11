-- Migration corrective: Fix permissions issue pour 0007
-- Cette migration vérifie les permissions avant d'exécuter les ALTER TABLE

BEGIN;

-- Vérifier si l'utilisateur actuel est propriétaire ou superuser
DO $$
DECLARE
    is_owner BOOLEAN;
    is_superuser BOOLEAN;
    current_user_name TEXT;
BEGIN
    SELECT current_user INTO current_user_name;
    SELECT usesuper INTO is_superuser FROM pg_user WHERE usename = current_user_name;

    -- Vérifier si l'utilisateur est owner de la table members
    SELECT EXISTS(
        SELECT 1 FROM pg_tables
        WHERE tablename = 'members'
        AND tableowner = current_user_name
    ) INTO is_owner;

    RAISE NOTICE 'Current user: % (superuser: %, owner: %)', current_user_name, is_superuser, is_owner;

    IF NOT (is_owner OR is_superuser) THEN
        RAISE NOTICE 'User % is not owner of table members, skipping ALTER TABLE statements', current_user_name;
        RAISE NOTICE 'Please grant appropriate permissions or run migrations as table owner';
        RETURN;
    END IF;

    -- Si on a les permissions, exécuter les ALTER TABLE
    RAISE NOTICE 'User has sufficient permissions, applying schema changes...';

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

    RAISE NOTICE 'Migration 0008_fix_permissions_workaround completed successfully';

EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Insufficient privileges to alter table members';
        RAISE NOTICE 'Please contact database administrator to grant permissions';
        RETURN;
END $$;

COMMIT;
