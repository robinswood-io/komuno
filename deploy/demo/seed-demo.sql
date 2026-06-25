-- Komuno demo seed data
-- Fictional, non-client data. Executed after schema restore and app migrations.

BEGIN;

INSERT INTO branding_config (config, updated_by)
VALUES (
  '{
    "organization": {
      "name": "Komuno Demo",
      "fullName": "Association Démo Komuno",
      "tagline": "Portail adhérents de démonstration réinitialisé toutes les heures",
      "url": "https://demo.komuno.org",
      "email": "demo@komuno.org"
    },
    "app": {
      "name": "Komuno Demo — Portail adhérents",
      "shortName": "Komuno Demo",
      "description": "Environnement de démonstration Komuno avec back-office administrateur public.",
      "ideaBoxName": "Boîte à idées",
      "showLogo": false
    },
    "colors": {
      "primary": "#123c37",
      "primaryDark": "#071414",
      "primaryLight": "#62f2bd",
      "secondary": "#7b61ff",
      "accent": "#62f2bd",
      "background": "#f7f6ef",
      "success": "#00c853",
      "successDark": "#00a844",
      "successLight": "#e8f5e9",
      "warning": "#ffa726",
      "warningDark": "#f57c00",
      "warningLight": "#fff3e0",
      "error": "#f44336",
      "errorDark": "#d32f2f",
      "errorLight": "#ffebee",
      "info": "#2196f3",
      "infoDark": "#1976d2",
      "infoLight": "#e3f2fd",
      "chart1": "#123c37",
      "chart2": "#62f2bd",
      "chart3": "#7b61ff",
      "chart4": "#d7ff6a",
      "chart5": "#f59e0b",
      "white": "#ffffff",
      "black": "#000000",
      "chartBorder": "#d6d3c5",
      "chartGrid": "#e7e4d8"
    },
    "links": {
      "website": "https://komuno.org",
      "support": "mailto:demo@komuno.org"
    }
  }',
  'demo-seed'
);

INSERT INTO admins (email, first_name, last_name, password, added_by, role, status, is_active, notification_email)
VALUES
  ('demo@komuno.fr', 'Demo', 'Komuno', NULL, 'demo-seed', 'super_admin', 'active', true, NULL),
  ('animation@demo.komuno.org', 'Camille', 'Animation', NULL, 'demo-seed', 'events_manager', 'active', true, NULL)
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  status = 'active',
  is_active = true,
  updated_at = NOW();

INSERT INTO feature_config (feature_key, enabled, updated_by)
VALUES
  ('ideas', true, 'demo-seed'),
  ('events', true, 'demo-seed'),
  ('loan', true, 'demo-seed'),
  ('patrons', true, 'demo-seed'),
  ('financial', true, 'demo-seed'),
  ('member_groups', true, 'demo-seed'),
  ('member_graph', true, 'demo-seed'),
  ('federation', true, 'demo-seed')
ON CONFLICT (feature_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO organizations (id, slug, name, type, domain, instance_url, is_active)
VALUES
  ('demo-org', 'demo-association', 'Association Démo Komuno', 'section', 'demo.komuno.org', 'https://demo.komuno.org', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain, instance_url = EXCLUDED.instance_url, is_active = true, updated_at = NOW();

INSERT INTO subscription_types (id, name, description, amount_in_cents, duration_type, is_active)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Adhésion annuelle', 'Adhésion standard de démonstration', 24000, 'yearly', true),
  ('22222222-2222-4222-8222-222222222222', 'Membre bienfaiteur', 'Contribution de soutien fictive', 50000, 'yearly', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, amount_in_cents = EXCLUDED.amount_in_cents, is_active = true, updated_at = NOW();

INSERT INTO members (id, email, first_name, last_name, company, department, city, postal_code, sector, phone, role, cjd_role, notes, status, proposed_by, engagement_score, first_seen_at, last_activity_at, activity_count, subscription_end_date, prospection_status, soncas_profile, created_by, assigned_to)
VALUES
  ('demo-member-001', 'alice.martin@example.org', 'Alice', 'Martin', 'Atelier Martin', 'Somme', 'Amiens', '80000', 'Artisanat', '06 00 00 00 01', 'Dirigeante', 'Membre', 'Profil fictif pour tester la fiche membre.', 'active', 'demo-seed', 82, NOW() - INTERVAL '120 days', NOW() - INTERVAL '2 days', 14, NOW() + INTERVAL '240 days', NULL, 'Sécurité', 'demo@komuno.fr', 'demo@komuno.fr'),
  ('demo-member-002', 'hugo.bernard@example.org', 'Hugo', 'Bernard', 'HB Conseil', 'Nord', 'Lille', '59000', 'Conseil', '06 00 00 00 02', 'Consultant', 'Commission événements', 'Profil fictif avec fort engagement.', 'active', 'Alice Martin', 91, NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day', 21, NOW() + INTERVAL '180 days', NULL, 'Nouveauté', 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-member-003', 'sarah.durand@example.org', 'Sarah', 'Durand', 'Durand Tech', 'Oise', 'Beauvais', '60000', 'Numérique', '06 00 00 00 03', 'Fondatrice', 'Prospect', 'Prospect fictif à qualifier.', 'proposed', 'Hugo Bernard', 43, NOW() - INTERVAL '30 days', NOW() - INTERVAL '8 days', 3, NULL, 'Qualification', 'Confort', 'demo@komuno.fr', 'demo@komuno.fr'),
  ('demo-member-004', 'mehdi.leroy@example.org', 'Mehdi', 'Leroy', 'Leroy Logistique', 'Pas-de-Calais', 'Arras', '62000', 'Logistique', '06 00 00 00 04', 'Directeur', 'Membre', 'Membre fictif pour les groupes.', 'active', 'demo-seed', 67, NOW() - INTERVAL '200 days', NOW() - INTERVAL '5 days', 9, NOW() + INTERVAL '90 days', NULL, 'Orgueil', 'demo@komuno.fr', 'animation@demo.komuno.org')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  company = EXCLUDED.company,
  status = EXCLUDED.status,
  prospection_status = EXCLUDED.prospection_status,
  engagement_score = EXCLUDED.engagement_score,
  last_activity_at = EXCLUDED.last_activity_at,
  updated_at = NOW();

INSERT INTO member_groups (id, name, type, year, description, color, is_active, created_by)
VALUES
  ('demo-group-bureau', 'Bureau 2026', 'board', 2026, 'Groupe fictif du bureau de l’association.', '#123c37', true, 'demo@komuno.fr'),
  ('demo-group-events', 'Commission événements', 'commission', 2026, 'Préparation et animation des rencontres.', '#7b61ff', true, 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, color = EXCLUDED.color, is_active = true, updated_at = NOW();

INSERT INTO member_group_memberships (group_id, member_email, role, start_date, assigned_by)
VALUES
  ('demo-group-bureau', 'alice.martin@example.org', 'Présidente', CURRENT_DATE - 80, 'demo@komuno.fr'),
  ('demo-group-bureau', 'mehdi.leroy@example.org', 'Trésorier', CURRENT_DATE - 80, 'demo@komuno.fr'),
  ('demo-group-events', 'hugo.bernard@example.org', 'Référent', CURRENT_DATE - 70, 'demo@komuno.fr'),
  ('demo-group-events', 'sarah.durand@example.org', 'Invitée', CURRENT_DATE - 10, 'demo@komuno.fr')
ON CONFLICT DO NOTHING;

INSERT INTO member_tags (id, name, color, description)
VALUES
  ('demo-tag-engaged', 'Très engagé', '#62f2bd', 'Participe régulièrement aux actions.'),
  ('demo-tag-prospect', 'À qualifier', '#f59e0b', 'Profil en phase de qualification.'),
  ('demo-tag-premium', 'Option Pro', '#7b61ff', 'Exemple de segmentation avancée.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, description = EXCLUDED.description;

INSERT INTO member_tag_assignments (member_email, tag_id, assigned_by)
VALUES
  ('alice.martin@example.org', 'demo-tag-engaged', 'demo@komuno.fr'),
  ('hugo.bernard@example.org', 'demo-tag-engaged', 'demo@komuno.fr'),
  ('sarah.durand@example.org', 'demo-tag-prospect', 'demo@komuno.fr'),
  ('alice.martin@example.org', 'demo-tag-premium', 'demo@komuno.fr')
ON CONFLICT DO NOTHING;

INSERT INTO events (id, title, description, date, location, max_participants, status, updated_by, organization_id, federation_visibility)
VALUES
  ('demo-event-001', 'Petit-déjeuner nouveaux membres', 'Accueil des nouveaux adhérents et présentation du portail.', NOW() + INTERVAL '14 days', 'Maison des Associations — Amiens', 35, 'published', 'demo@komuno.fr', 'demo-org', 'local'),
  ('demo-event-002', 'Atelier commission événements', 'Organisation fictive d’un événement réseau.', NOW() + INTERVAL '28 days', 'Espace coworking Demo', 18, 'published', 'animation@demo.komuno.org', 'demo-org', 'local'),
  ('demo-event-003', 'Afterwork partenaires', 'Exemple d’événement avec places limitées.', NOW() + INTERVAL '45 days', 'Le Quai — Demo', 50, 'draft', 'demo@komuno.fr', 'demo-org', 'local')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, date = EXCLUDED.date, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO ideas (id, title, description, proposed_by, proposed_by_email, status, featured, deadline, updated_by)
VALUES
  ('demo-idea-001', 'Créer un programme de mentorat', 'Mettre en relation nouveaux membres et membres expérimentés.', 'Alice Martin', 'alice.martin@example.org', 'approved', true, NOW() + INTERVAL '60 days', 'demo@komuno.fr'),
  ('demo-idea-002', 'Mutualiser une bibliothèque de ressources', 'Centraliser modèles, guides et documents utiles.', 'Hugo Bernard', 'hugo.bernard@example.org', 'pending', false, NOW() + INTERVAL '30 days', 'demo@komuno.fr'),
  ('demo-idea-003', 'Organiser une visite d’entreprise', 'Tester le workflow d’idées et votes côté admin.', 'Sarah Durand', 'sarah.durand@example.org', 'in_progress', false, NOW() + INTERVAL '90 days', 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, featured = EXCLUDED.featured, updated_at = NOW();

INSERT INTO loan_items (id, title, description, lender_name, status, proposed_by, proposed_by_email, updated_by)
VALUES
  ('demo-loan-001', 'Vidéoprojecteur portable', 'Matériel fictif disponible pour les réunions.', 'Association Démo', 'available', 'Alice Martin', 'alice.martin@example.org', 'demo@komuno.fr'),
  ('demo-loan-002', 'Kit badges événement', 'Badges, tours de cou et signalétique.', 'Commission événements', 'available', 'Hugo Bernard', 'hugo.bernard@example.org', 'demo@komuno.fr'),
  ('demo-loan-003', 'Micro sans fil', 'Exemple d’objet en attente de validation.', 'Mehdi Leroy', 'pending', 'Mehdi Leroy', 'mehdi.leroy@example.org', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO financial_categories (id, name, type, description, is_active)
VALUES
  ('demo-fin-cat-membership', 'Cotisations', 'revenue', 'Recettes d’adhésion fictives.', true),
  ('demo-fin-cat-events', 'Événements', 'expense', 'Budget événementiel fictif.', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, description = EXCLUDED.description, is_active = true, updated_at = NOW();

INSERT INTO financial_budgets (id, name, category, period, year, amount_in_cents, description, created_by)
VALUES
  ('demo-budget-events-2026', 'Budget événements 2026', 'demo-fin-cat-events', 'year', 2026, 1200000, 'Budget fictif pour tester le module finance.', 'demo@komuno.fr'),
  ('demo-budget-tools-2026', 'Budget outils 2026', 'demo-fin-cat-events', 'year', 2026, 350000, 'Budget fictif SaaS / outils.', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, amount_in_cents = EXCLUDED.amount_in_cents, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO notifications (id, user_id, type, title, body, icon, is_read, metadata)
VALUES
  ('demo-notif-001', 'demo@komuno.fr', 'info', 'Bienvenue dans la démo', 'Cette instance est réinitialisée automatiquement toutes les heures.', 'sparkles', false, '{"source":"demo-seed"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, is_read = false, metadata = EXCLUDED.metadata, updated_at = NOW();

COMMIT;
