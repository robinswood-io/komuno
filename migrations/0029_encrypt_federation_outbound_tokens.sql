-- 0029 - Coffre chiffré pour les jetons sortants de fédération

ALTER TABLE organization_relations
  ADD COLUMN IF NOT EXISTS federation_token_encrypted text,
  ADD COLUMN IF NOT EXISTS federation_token_encryption_key_id text,
  ADD COLUMN IF NOT EXISTS federation_token_encrypted_at timestamp;

CREATE INDEX IF NOT EXISTS organization_relations_token_encrypted_idx
  ON organization_relations (federation_token_encrypted_at)
  WHERE federation_token_encrypted IS NOT NULL;

-- Le backfill du secret sortant ne peut pas être fait en SQL : le chiffrement utilise
-- une clé applicative hors base. L'application migre automatiquement les tokens legacy
-- federation_token -> federation_token_encrypted au prochain usage sortant.
