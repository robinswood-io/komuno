-- Migration 0011: Créer un compte admin initial si aucun admin actif (avec mot de passe) n'existe.
-- Cela permet d'accéder au back-office sur un environnement vierge.
--
-- Credentials temporaires : setup@admin.cjd / Admin2024!CJD
-- ⚠️  IMPORTANT : Changer le mot de passe immédiatement après la première connexion !
--
-- Ce INSERT ne s'exécute QUE si la table admins ne contient aucun admin actif avec mot de passe.

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
SELECT
  'setup@admin.cjd',
  'Setup',
  'Admin',
  '$2b$10$a9dQ/YRdDqdFOZeBUrX8KeFvXoccoN0DGH2v1XxtQjjFWWdGi/JsS',
  'super_admin',
  'active',
  true,
  'migration-0011',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM admins
  WHERE status = 'active'
    AND is_active = true
    AND password IS NOT NULL
);
