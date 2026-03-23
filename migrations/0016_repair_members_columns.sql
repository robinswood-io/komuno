-- Migration 0016: Réparation des colonnes members manquantes sur repicardie.fr
-- La DB de REP a été créée avec une ancienne version du schéma.
-- Certaines colonnes des migrations 0000-0006 (seedées sans être exécutées)
-- n'ont jamais été ajoutées à la table members.
-- Toutes les opérations sont idempotentes (IF NOT EXISTS / DEFAULT).

-- Colonnes CRM de base
ALTER TABLE members ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS cjd_role TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS proposed_by TEXT;

-- Localisation (migration 0002)
ALTER TABLE members ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sector TEXT;

-- Pipeline CRM (migration 0004 + 0014 + 0015)
ALTER TABLE members ADD COLUMN IF NOT EXISTS prospection_status TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_contact_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS meeting_date DATE;

-- Profil & suivi (migration 0000 — was in initial schema but REP may predate it)
ALTER TABLE members ADD COLUMN IF NOT EXISTS soncas_profile TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS engagement_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;
ALTER TABLE members ADD COLUMN IF NOT EXISTS activity_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;

-- Backfill: s'assurer que first_seen_at et last_activity_at ne sont pas NULL
-- (colonnes marquées NOT NULL dans le schéma)
UPDATE members SET first_seen_at = created_at WHERE first_seen_at IS NULL;
UPDATE members SET last_activity_at = COALESCE(updated_at, created_at) WHERE last_activity_at IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS members_email_idx ON members(email);
CREATE INDEX IF NOT EXISTS members_last_activity_at_idx ON members(last_activity_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS members_engagement_score_idx ON members(engagement_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS members_status_idx ON members(status);
CREATE INDEX IF NOT EXISTS members_cjd_role_idx ON members(cjd_role);
CREATE INDEX IF NOT EXISTS members_city_idx ON members(city);
CREATE INDEX IF NOT EXISTS members_department_idx ON members(department);
CREATE INDEX IF NOT EXISTS members_prospection_status_idx ON members(prospection_status);
