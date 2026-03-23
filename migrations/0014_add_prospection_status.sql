-- Migration 0014: Ajouter colonne prospection_status aux membres
-- Sépare le statut pipeline CRM du statut membre (active/proposed/inactive)
-- Un prospect = prospection_status IS NOT NULL
-- Un membre actif = prospection_status IS NULL

ALTER TABLE members ADD COLUMN IF NOT EXISTS prospection_status TEXT;

-- Migrer les anciens statuts pipeline stockés dans la colonne status
UPDATE members SET prospection_status = 'Qualification', status = 'proposed' WHERE status = 'A contacter';
UPDATE members SET prospection_status = 'R1',            status = 'proposed' WHERE status = 'RDV prévu';
UPDATE members SET prospection_status = 'R2',            status = 'proposed' WHERE status = 'Intérêt - à relancer';
UPDATE members SET prospection_status = 'Hors cible',    status = 'proposed' WHERE status = '2027';
UPDATE members SET prospection_status = 'Refusé',        status = 'proposed' WHERE status = 'Refusé' AND prospection_status IS NULL;

CREATE INDEX IF NOT EXISTS members_prospection_status_idx ON members(prospection_status);
