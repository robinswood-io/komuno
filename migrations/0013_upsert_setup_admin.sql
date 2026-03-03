-- Migration 0013: Garantir l'existence du compte setup@admin.cjd avec le bon hash.
-- Utilise ON CONFLICT (email) DO UPDATE pour être idempotent.
-- Corrige les cas où 0011 a été sauté (admins existants avec mot de passe)
-- et où 0012 n'a pas trouvé la ligne à mettre à jour.
--
-- Credentials : setup@admin.cjd / AdminCJD2024
-- ⚠️  IMPORTANT : Changer le mot de passe immédiatement après la première connexion !

INSERT INTO admins (
  email,
  first_name,
  last_name,
  password,
  role,
  status,
  is_active,
  added_by,
  created_at,
  updated_at
)
VALUES (
  'setup@admin.cjd',
  'Setup',
  'Admin',
  '$2b$10$jYxTzll6AYHKy.Vew9HJR.BiKz8eBYpCCpygO.UUm6B4s9HddEZuu',
  'super_admin',
  'active',
  true,
  'migration-0013',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password   = EXCLUDED.password,
  status     = 'active',
  is_active  = true,
  updated_at = NOW();
