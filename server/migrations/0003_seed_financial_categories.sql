-- Migration: Seed default financial categories
-- This migration inserts default expense and income categories for the financial module

-- Insert expense categories (only if they don't already exist)
INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Événements', 'expense', 'Dépenses liées aux événements et activités de l''association', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Événements' AND type = 'expense');

INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sponsoring', 'expense', 'Coûts des sponsorships et partenariats', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Sponsoring' AND type = 'expense');

INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Communication', 'expense', 'Dépenses de marketing, publicité et communication', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Communication' AND type = 'expense');

INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Formation', 'expense', 'Frais de formation et développement des membres', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Formation' AND type = 'expense');

INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Autre', 'expense', 'Autres dépenses diverses', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Autre' AND type = 'expense');

-- Insert income categories
INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Adhésions', 'income', 'Cotisations et frais d''adhésion des membres', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Adhésions' AND type = 'income');

INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Donations', 'income', 'Dons et contributions', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Donations' AND type = 'income');

INSERT INTO financial_categories (id, name, type, description, parent_id, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Sponsors', 'income', 'Revenus des sponsorships et partenariats', NULL, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_categories WHERE name = 'Sponsors' AND type = 'income');

-- Verify insertion
DO $$
DECLARE
  category_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_count FROM financial_categories WHERE is_active = true;
  RAISE NOTICE 'Total active financial categories: %', category_count;

  IF category_count < 8 THEN
    RAISE WARNING 'Expected at least 8 categories, but found only %', category_count;
  ELSE
    RAISE NOTICE 'Successfully seeded % financial categories', category_count;
  END IF;
END $$;
