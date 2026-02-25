-- Migration: Ajout champs CRM prospection
-- Ajoute epci, prospectionStatus, firstContactDate, meetingDate

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS epci TEXT,
  ADD COLUMN IF NOT EXISTS prospection_status TEXT,
  ADD COLUMN IF NOT EXISTS first_contact_date DATE,
  ADD COLUMN IF NOT EXISTS meeting_date DATE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS members_prospection_status_idx ON members(prospection_status);

-- Commentaires
COMMENT ON COLUMN members.epci IS 'Établissement Public de Coopération Intercommunale';
COMMENT ON COLUMN members.prospection_status IS 'Statut prospection: 2027, Refusé, A contacter, RDV prévu, Intérêt - à relancer';
COMMENT ON COLUMN members.first_contact_date IS 'Date du premier contact avec le prospect';
COMMENT ON COLUMN members.meeting_date IS 'Date du rendez-vous prévu';
