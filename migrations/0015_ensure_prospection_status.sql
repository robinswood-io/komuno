-- Migration 0015: Garantir que prospection_status existe sur tous les serveurs
-- Corrige le cas repicardie.fr où 0004 a été seedée (non exécutée) et 0014 trackée sans s'appliquer
-- Toutes les opérations sont idempotentes (IF NOT EXISTS).

ALTER TABLE members ADD COLUMN IF NOT EXISTS prospection_status TEXT;

CREATE INDEX IF NOT EXISTS members_prospection_status_idx ON members(prospection_status);

-- Migrer les anciens statuts legacy si présents dans la colonne status
UPDATE members SET prospection_status = 'Qualification', status = 'proposed'
  WHERE status = 'A contacter' AND prospection_status IS NULL;

UPDATE members SET prospection_status = 'R1', status = 'proposed'
  WHERE status = 'RDV prévu' AND prospection_status IS NULL;

UPDATE members SET prospection_status = 'R2', status = 'proposed'
  WHERE status = 'Intérêt - à relancer' AND prospection_status IS NULL;

UPDATE members SET prospection_status = 'Hors cible', status = 'proposed'
  WHERE status = '2027' AND prospection_status IS NULL;

UPDATE members SET prospection_status = 'Refusé', status = 'proposed'
  WHERE status = 'Refusé' AND prospection_status IS NULL;
