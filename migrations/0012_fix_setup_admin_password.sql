-- Migration 0012: Corriger le mot de passe du compte setup@admin.cjd.
-- La migration 0011 a généré un hash bcrypt incorrect à cause d'un problème
-- d'échappement du caractère '!' dans le shell. Ce script met à jour le hash.
--
-- Credentials corrects : setup@admin.cjd / AdminCJD2024
-- ⚠️  IMPORTANT : Changer le mot de passe immédiatement après la première connexion !

UPDATE admins
SET
  password = '$2b$10$jYxTzll6AYHKy.Vew9HJR.BiKz8eBYpCCpygO.UUm6B4s9HddEZuu',
  updated_at = NOW()
WHERE email = 'setup@admin.cjd';
