-- Migration: Unifier statut membres + ajouter contacts mécènes
-- 1. Fusionner prospection_status dans status pour les membres
-- 2. Supprimer la colonne epci
-- 3. Créer table patron_contacts pour multiples contacts par mécène

BEGIN;

-- ===================================
-- MEMBRES: Fusionner prospection_status dans status
-- ===================================

-- Migrer les données de prospection_status vers status
-- Si prospection_status est renseigné, il prend la priorité
UPDATE members
SET status = prospection_status
WHERE prospection_status IS NOT NULL 
  AND prospection_status != '';

-- Supprimer l'index sur prospection_status
DROP INDEX IF EXISTS members_prospection_status_idx;

-- Supprimer les colonnes epci et prospection_status
ALTER TABLE members
  DROP COLUMN IF EXISTS epci,
  DROP COLUMN IF EXISTS prospection_status;

-- Ajouter un index sur city (remplace epci pour le filtrage géographique)
CREATE INDEX IF NOT EXISTS members_city_idx ON members(city);

-- ===================================
-- MÉCÈNES: Créer table des contacts
-- ===================================

-- Table pour gérer plusieurs contacts par mécène (entreprise)
CREATE TABLE IF NOT EXISTS patron_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  patron_id VARCHAR NOT NULL REFERENCES patrons(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour les contacts
CREATE INDEX IF NOT EXISTS patron_contacts_patron_id_idx ON patron_contacts(patron_id);
CREATE INDEX IF NOT EXISTS patron_contacts_email_idx ON patron_contacts(email);
CREATE INDEX IF NOT EXISTS patron_contacts_is_primary_idx ON patron_contacts(is_primary);

-- Commentaires
COMMENT ON TABLE patron_contacts IS 'Contacts multiples pour chaque mécène (entreprise)';
COMMENT ON COLUMN patron_contacts.patron_id IS 'Référence au mécène (entreprise)';
COMMENT ON COLUMN patron_contacts.is_primary IS 'Contact principal de l''entreprise';

-- ===================================
-- Commentaires sur les changements
-- ===================================

COMMENT ON COLUMN members.status IS 'Statut unifié: active, proposed, inactive, 2027, Refusé, A contacter, RDV prévu, Intérêt - à relancer';
COMMENT ON COLUMN members.city IS 'Ville du membre (utilisé pour filtrage géographique)';

COMMIT;
