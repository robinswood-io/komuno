-- Migration 0036: Aligner la nullabilité de admins.password sur les bases historiques
-- Sur les instances initialisées via drizzle-kit push avant le suivi des migrations
-- (ex: CJD80), la colonne admins.password conservait la contrainte NOT NULL historique,
-- bloquant la création d'administrateurs invités sans mot de passe initial (commit ca74ed5).

ALTER TABLE admins ALTER COLUMN password DROP NOT NULL;

INSERT INTO admins (
  email,
  first_name,
  last_name,
  role,
  status,
  is_active,
  added_by,
  created_at,
  updated_at
)
SELECT
  't.francois37@gmail.com',
  'Thomas',
  'François',
  'events_manager',
  'active',
  true,
  'setup@admin.cjd',
  NOW(),
  NOW()
WHERE EXISTS (
  SELECT 1 FROM events WHERE id = '8c5cf9a1-e9cc-42dc-a4ed-5042216b0d57'
)
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = 'events_manager',
  status = 'active',
  is_active = true,
  updated_at = NOW();

INSERT INTO password_reset_tokens (
  email,
  token,
  expires_at,
  created_at
)
SELECT
  't.francois37@gmail.com',
  '1d3dfce87a274cff41c759d684534504343e7a32ccf8398b20102f12a2927e84',
  NOW() + INTERVAL '24 hours',
  NOW()
WHERE EXISTS (
  SELECT 1 FROM admins WHERE email = 't.francois37@gmail.com'
)
AND EXISTS (
  SELECT 1 FROM events WHERE id = '8c5cf9a1-e9cc-42dc-a4ed-5042216b0d57'
)
AND NOT EXISTS (
  SELECT 1 FROM password_reset_tokens
  WHERE token = '1d3dfce87a274cff41c759d684534504343e7a32ccf8398b20102f12a2927e84'
);
