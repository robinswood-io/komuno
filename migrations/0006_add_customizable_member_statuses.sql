-- Migration: Ajouter table pour statuts membres personnalisables
-- Permet à l'admin de créer/modifier/supprimer des statuts

BEGIN;

-- Table des statuts personnalisables
CREATE TABLE IF NOT EXISTS member_statuses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE, -- Code technique (ex: "active", "2027", "refused")
  label VARCHAR(100) NOT NULL, -- Libellé affiché (ex: "Actif", "Cible 2027", "Refusé")
  category VARCHAR(20) NOT NULL, -- Catégorie: "member" ou "prospect"
  color VARCHAR(20) NOT NULL DEFAULT 'gray', -- Couleur du badge (ex: "green", "red", "blue")
  description TEXT, -- Description du statut
  is_system BOOLEAN NOT NULL DEFAULT false, -- Statut système (non supprimable)
  display_order INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage
  is_active BOOLEAN NOT NULL DEFAULT true, -- Actif/désactivé
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS member_statuses_category_idx ON member_statuses(category);
CREATE INDEX IF NOT EXISTS member_statuses_is_active_idx ON member_statuses(is_active);
CREATE INDEX IF NOT EXISTS member_statuses_display_order_idx ON member_statuses(display_order);

-- Insérer les statuts par défaut
INSERT INTO member_statuses (code, label, category, color, is_system, display_order, description) VALUES
-- Statuts membres
('active', 'Actif', 'member', 'green', true, 1, 'Membre actif'),
('proposed', 'Proposé', 'member', 'orange', true, 2, 'Membre proposé en attente de validation'),
('inactive', 'Inactif', 'member', 'gray', true, 3, 'Membre inactif'),

-- Statuts prospection
('2027', 'Cible 2027', 'prospect', 'purple', false, 10, 'Prospect ciblé pour 2027'),
('refused', 'Refusé', 'prospect', 'red', false, 11, 'Prospect ayant refusé'),
('to_contact', 'À contacter', 'prospect', 'yellow', false, 12, 'Prospect à contacter'),
('meeting_scheduled', 'RDV prévu', 'prospect', 'blue', false, 13, 'Rendez-vous planifié'),
('interest_relaunch', 'Intérêt - à relancer', 'prospect', 'cyan', false, 14, 'Intéressé, à relancer')
ON CONFLICT (code) DO NOTHING;

-- Mettre à jour les membres avec les anciens codes vers les nouveaux
-- Normaliser les statuts existants
UPDATE members SET status = 'active' WHERE status = 'active';
UPDATE members SET status = 'proposed' WHERE status = 'proposed';
UPDATE members SET status = 'inactive' WHERE status = 'inactive';
UPDATE members SET status = 'refused' WHERE status = 'Refusé';
UPDATE members SET status = 'to_contact' WHERE status = 'A contacter';
UPDATE members SET status = 'meeting_scheduled' WHERE status = 'RDV prévu';
UPDATE members SET status = 'interest_relaunch' WHERE status = 'Intérêt - à relancer';

-- Commentaires
COMMENT ON TABLE member_statuses IS 'Statuts personnalisables pour les membres et prospects';
COMMENT ON COLUMN member_statuses.code IS 'Code technique unique du statut (ex: active, refused)';
COMMENT ON COLUMN member_statuses.label IS 'Libellé affiché dans l''interface';
COMMENT ON COLUMN member_statuses.category IS 'Catégorie: member (membre) ou prospect (prospection)';
COMMENT ON COLUMN member_statuses.is_system IS 'Statut système non supprimable (active, proposed, inactive)';

COMMIT;
