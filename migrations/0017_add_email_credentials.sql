-- Migration 0017: Ajouter username/password à email_config
-- Ces colonnes sont dans le schéma Zod mais manquaient dans la table.
-- Nécessaire pour que les credentials SMTP saisis dans l'UI soient persistés.

ALTER TABLE email_config ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE email_config ADD COLUMN IF NOT EXISTS password TEXT;
