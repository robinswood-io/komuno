-- Migration 0018: Corriger les statuts pipeline stockés dans status au lieu de prospection_status
-- Les anciens enregistrements ont leur étape pipeline dans le champ status (bug lors de la création).
-- Cette migration déplace les statuts pipeline vers prospection_status et normalise status='proposed'.

-- target_2027 → Hors cible
UPDATE members
SET prospection_status = 'Hors cible', status = 'proposed'
WHERE status = 'target_2027' AND prospection_status IS NULL;

-- refused (prospect refusé) → Refusé
UPDATE members
SET prospection_status = 'Refusé', status = 'proposed'
WHERE status = 'refused' AND prospection_status IS NULL;

-- proposed sans prospection_status → Qualification (statut par défaut pipeline)
UPDATE members
SET prospection_status = 'Qualification'
WHERE status = 'proposed' AND prospection_status IS NULL;
