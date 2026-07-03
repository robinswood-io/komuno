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


-- Komuno demo extended seed data
-- Fictional, non-client data. Idempotent. No raw production secrets.

BEGIN;

-- Ensure every public module is visible in demo mode.
INSERT INTO feature_config (feature_key, enabled, updated_by)
VALUES
  ('forms', true, 'demo-seed'),
  ('trainings', true, 'demo-seed'),
  ('integrations', true, 'demo-seed'),
  ('automations', true, 'demo-seed'),
  ('event_operations', true, 'demo-seed'),
  ('tools', true, 'demo-seed'),
  ('tracking', true, 'demo-seed'),
  ('development_requests', true, 'demo-seed')
ON CONFLICT (feature_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = NOW();

-- Demo-only organization graph/federation placeholders.
INSERT INTO organizations (id, slug, name, type, domain, instance_url, is_active)
VALUES
  ('demo-region-org', 'demo-region', 'Réseau Régional Démo', 'region', 'region.demo.komuno.org', 'https://demo.komuno.org/o/demo-region', true)
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, type = EXCLUDED.type, domain = EXCLUDED.domain, instance_url = EXCLUDED.instance_url, is_active = true, updated_at = NOW();

INSERT INTO organization_networks (id, slug, name, description, is_active)
VALUES
  ('demo-network-001', 'reseau-demo', 'Réseau Démo Komuno', 'Réseau fictif pour illustrer les relations explicites entre instances.', true)
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, is_active = true, updated_at = NOW();

INSERT INTO organization_relations (id, from_organization_id, to_organization_id, relation_type, status, permissions, sync_enabled, sync_status, federation_token, federation_token_hash, federation_token_fingerprint, federation_token_encrypted, federation_token_encryption_key_id, federation_token_encrypted_at)
VALUES
  ('demo-relation-region-section', 'demo-region-org', 'demo-org', 'region_section', 'active', '{"events":true,"forms":true,"trainings":true,"members":false,"finance":false}'::jsonb, false, 'idle', NULL, 'demo-token-hash-not-a-secret', 'demo-fp-9a3d', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET permissions = EXCLUDED.permissions, sync_enabled = EXCLUDED.sync_enabled, sync_status = EXCLUDED.sync_status, federation_token = NULL, federation_token_hash = EXCLUDED.federation_token_hash, federation_token_fingerprint = EXCLUDED.federation_token_fingerprint, federation_token_encrypted = NULL, updated_at = NOW();

INSERT INTO organization_admins (organization_id, email, role, status, source, stripe_session_id)
VALUES
  ('demo-org', 'demo@komuno.fr', 'owner', 'active', 'demo_seed', NULL),
  ('demo-org', 'animation@demo.komuno.org', 'admin', 'active', 'demo_seed', NULL)
ON CONFLICT (organization_id, email) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, source = EXCLUDED.source, updated_at = NOW();

INSERT INTO organization_admin_invitations (id, organization_id, email, role, token_hash, status, expires_at)
VALUES
  ('demo-admin-invite-001', 'demo-org', 'invitee.demo@example.org', 'admin', 'demo-invitation-token-hash-only', 'pending', NOW() + INTERVAL '10 days')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, token_hash = EXCLUDED.token_hash, status = EXCLUDED.status, expires_at = EXCLUDED.expires_at, updated_at = NOW();

-- Member lifecycle tables.
INSERT INTO member_subscriptions (id, member_email, amount_in_cents, start_date, end_date, subscription_type, subscription_type_id, status, payment_method, assigned_by)
VALUES
  (101, 'alice.martin@example.org', 24000, CURRENT_DATE - 120, CURRENT_DATE + 245, 'Adhésion annuelle', '11111111-1111-4111-8111-111111111111', 'active', 'card', 'demo@komuno.fr'),
  (102, 'hugo.bernard@example.org', 50000, CURRENT_DATE - 90, CURRENT_DATE + 275, 'Membre bienfaiteur', '22222222-2222-4222-8222-222222222222', 'active', 'transfer', 'demo@komuno.fr'),
  (103, 'mehdi.leroy@example.org', 24000, CURRENT_DATE - 200, CURRENT_DATE + 165, 'Adhésion annuelle', '11111111-1111-4111-8111-111111111111', 'active', 'check', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET amount_in_cents = EXCLUDED.amount_in_cents, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, subscription_type = EXCLUDED.subscription_type, subscription_type_id = EXCLUDED.subscription_type_id, status = EXCLUDED.status, payment_method = EXCLUDED.payment_method, assigned_by = EXCLUDED.assigned_by;

INSERT INTO member_activities (id, member_email, activity_type, entity_type, entity_id, entity_title, metadata, score_impact, occurred_at)
VALUES
  ('demo-activity-001', 'alice.martin@example.org', 'registration', 'event', 'demo-event-001', 'Petit-déjeuner nouveaux membres', '{"source":"demo"}', 8, NOW() - INTERVAL '5 days'),
  ('demo-activity-002', 'hugo.bernard@example.org', 'idea_vote', 'idea', 'demo-idea-001', 'Créer un programme de mentorat', '{"source":"demo"}', 4, NOW() - INTERVAL '3 days'),
  ('demo-activity-003', 'sarah.durand@example.org', 'form_response', 'survey_form', 'demo-form-001', 'Questionnaire satisfaction', '{"source":"demo"}', 5, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET member_email = EXCLUDED.member_email, activity_type = EXCLUDED.activity_type, entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id, entity_title = EXCLUDED.entity_title, metadata = EXCLUDED.metadata, score_impact = EXCLUDED.score_impact, occurred_at = EXCLUDED.occurred_at;

INSERT INTO member_relations (id, member_email, related_member_email, relation_type, description, created_by)
VALUES
  ('demo-relation-member-001', 'alice.martin@example.org', 'hugo.bernard@example.org', 'mentor', 'Alice accompagne Hugo sur l’animation réseau.', 'demo@komuno.fr'),
  ('demo-relation-member-002', 'hugo.bernard@example.org', 'sarah.durand@example.org', 'sponsor', 'Hugo a proposé Sarah comme prospect fictif.', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET relation_type = EXCLUDED.relation_type, description = EXCLUDED.description, created_by = EXCLUDED.created_by;

INSERT INTO member_tasks (id, member_email, title, description, task_type, status, due_date, completed_at, completed_by, assigned_to, created_by)
VALUES
  ('demo-task-001', 'sarah.durand@example.org', 'Qualifier le besoin de Sarah', 'Appeler le prospect fictif et noter ses attentes.', 'prospection', 'todo', NOW() + INTERVAL '4 days', NULL, NULL, 'demo@komuno.fr', 'demo@komuno.fr'),
  ('demo-task-002', 'alice.martin@example.org', 'Valider la liste des invités', 'Contrôler la liste pour le petit-déjeuner démo.', 'event', 'done', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', 'animation@demo.komuno.org', 'animation@demo.komuno.org', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, task_type = EXCLUDED.task_type, status = EXCLUDED.status, due_date = EXCLUDED.due_date, completed_at = EXCLUDED.completed_at, completed_by = EXCLUDED.completed_by, assigned_to = EXCLUDED.assigned_to, updated_at = NOW();

-- Event registrations and unsubscribes.
INSERT INTO inscriptions (id, event_id, name, email, company, phone, comments)
VALUES
  ('demo-inscription-001', 'demo-event-001', 'Alice Martin', 'alice.martin@example.org', 'Atelier Martin', '06 00 00 00 01', 'Présente avec un invité.'),
  ('demo-inscription-002', 'demo-event-001', 'Hugo Bernard', 'hugo.bernard@example.org', 'HB Conseil', '06 00 00 00 02', 'Intéressé par le mentorat.'),
  ('demo-inscription-003', 'demo-event-002', 'Mehdi Leroy', 'mehdi.leroy@example.org', 'Leroy Logistique', '06 00 00 00 04', 'Peut aider sur la logistique.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, company = EXCLUDED.company, phone = EXCLUDED.phone, comments = EXCLUDED.comments;

INSERT INTO unsubscriptions (id, event_id, name, email, comments)
VALUES
  ('demo-unsubscription-001', 'demo-event-003', 'Sarah Durand', 'sarah.durand@example.org', 'Indisponible ce jour-là — exemple fictif.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, comments = EXCLUDED.comments;

-- Patrons, donations and sponsorships.
INSERT INTO patrons (id, first_name, last_name, role, company, department, city, postal_code, sector, phone, email, notes, status, created_by)
VALUES
  ('demo-patron-001', 'Nora', 'Petit', 'Directrice communication', 'Demo Banque', 'Somme', 'Amiens', '80000', 'Banque', '06 00 00 01 01', 'nora.petit@example.org', 'Mécène fictif récurrent.', 'active', 'demo@komuno.fr'),
  ('demo-patron-002', 'Louis', 'Moreau', 'Fondateur', 'Studio Moreau', 'Nord', 'Lille', '59000', 'Design', '06 00 00 01 02', 'louis.moreau@example.org', 'Partenaire visuel fictif.', 'active', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, role = EXCLUDED.role, company = EXCLUDED.company, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW();

INSERT INTO patron_donations (id, patron_id, donated_at, amount, occasion, recorded_by)
VALUES
  ('demo-donation-001', 'demo-patron-001', NOW() - INTERVAL '20 days', 120000, 'Soutien annuel démo', 'demo@komuno.fr'),
  ('demo-donation-002', 'demo-patron-002', NOW() - INTERVAL '12 days', 45000, 'Contribution événement fictive', 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET donated_at = EXCLUDED.donated_at, amount = EXCLUDED.amount, occasion = EXCLUDED.occasion, recorded_by = EXCLUDED.recorded_by;

INSERT INTO patron_updates (id, patron_id, type, subject, date, start_time, duration, description, notes, created_by)
VALUES
  ('demo-patron-update-001', 'demo-patron-001', 'call', 'Point partenariat T2', CURRENT_DATE - 10, '09:30', 30, 'Échange fictif sur la visibilité événementielle.', 'Relancer avec le kit sponsor.', 'demo@komuno.fr'),
  ('demo-patron-update-002', 'demo-patron-002', 'meeting', 'Brief supports visuels', CURRENT_DATE - 5, '14:00', 45, 'Réunion fictive pour préparer les kakémonos.', 'Logo reçu en version démo.', 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, subject = EXCLUDED.subject, date = EXCLUDED.date, start_time = EXCLUDED.start_time, duration = EXCLUDED.duration, description = EXCLUDED.description, notes = EXCLUDED.notes, updated_at = NOW();

INSERT INTO event_sponsorships (id, event_id, patron_id, level, amount, benefits, is_publicly_visible, status, logo_url, website_url, proposed_by_admin_email, confirmed_at)
VALUES
  ('demo-sponsorship-001', 'demo-event-001', 'demo-patron-001', 'gold', 75000, 'Logo sur la page événement et mention pendant l’accueil.', true, 'confirmed', NULL, 'https://example.org/demo-banque', 'demo@komuno.fr', NOW() - INTERVAL '9 days'),
  ('demo-sponsorship-002', 'demo-event-002', 'demo-patron-002', 'silver', 30000, 'Support visuel fictif pour l’atelier.', true, 'proposed', NULL, 'https://example.org/studio-moreau', 'animation@demo.komuno.org', NULL)
ON CONFLICT (id) DO UPDATE SET level = EXCLUDED.level, amount = EXCLUDED.amount, benefits = EXCLUDED.benefits, is_publicly_visible = EXCLUDED.is_publicly_visible, status = EXCLUDED.status, website_url = EXCLUDED.website_url, proposed_by_admin_email = EXCLUDED.proposed_by_admin_email, confirmed_at = EXCLUDED.confirmed_at, updated_at = NOW();

INSERT INTO idea_patron_proposals (id, idea_id, patron_id, proposed_by_admin_email, status, comments)
VALUES
  ('demo-idea-patron-001', 'demo-idea-001', 'demo-patron-001', 'demo@komuno.fr', 'proposed', 'Mécénat fictif pour soutenir le mentorat.')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, comments = EXCLUDED.comments, updated_at = NOW();

INSERT INTO votes (id, idea_id, voter_name, voter_email)
VALUES
  ('demo-vote-001', 'demo-idea-001', 'Alice Martin', 'alice.martin@example.org'),
  ('demo-vote-002', 'demo-idea-001', 'Hugo Bernard', 'hugo.bernard@example.org'),
  ('demo-vote-003', 'demo-idea-002', 'Mehdi Leroy', 'mehdi.leroy@example.org')
ON CONFLICT (id) DO UPDATE SET idea_id = EXCLUDED.idea_id, voter_name = EXCLUDED.voter_name, voter_email = EXCLUDED.voter_email;

-- Complete finance demo: categories, budgets, expenses, forecasts, revenues.
INSERT INTO financial_categories (id, name, type, parent_id, description, is_active)
VALUES
  ('demo-fin-cat-sponsorship', 'Partenariats', 'revenue', NULL, 'Recettes de mécénat et sponsoring fictives.', true),
  ('demo-fin-cat-training', 'Formations', 'expense', NULL, 'Coûts pédagogiques et logistiques fictifs.', true),
  ('demo-fin-cat-tools', 'Outils numériques', 'expense', NULL, 'Abonnements et matériel logiciel de démonstration.', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, parent_id = EXCLUDED.parent_id, description = EXCLUDED.description, is_active = true, updated_at = NOW();

INSERT INTO financial_budgets (id, name, category, period, year, month, quarter, amount_in_cents, description, created_by)
VALUES
  ('demo-budget-training-q3-2026', 'Budget formations T3 2026', 'demo-fin-cat-training', 'quarter', 2026, NULL, 3, 420000, 'Budget fictif pour deux sessions de formation.', 'demo@komuno.fr'),
  ('demo-budget-tools-2026', 'Budget outils numériques 2026', 'demo-fin-cat-tools', 'year', 2026, NULL, NULL, 350000, 'Abonnements et outils de démonstration.', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, period = EXCLUDED.period, year = EXCLUDED.year, month = EXCLUDED.month, quarter = EXCLUDED.quarter, amount_in_cents = EXCLUDED.amount_in_cents, description = EXCLUDED.description, created_by = EXCLUDED.created_by, updated_at = NOW();

INSERT INTO financial_expenses (id, category, description, amount_in_cents, expense_date, payment_method, vendor, budget_id, receipt_url, created_by)
VALUES
  ('demo-expense-001', 'demo-fin-cat-events', 'Location salle petit-déjeuner démo', 28000, CURRENT_DATE - 7, 'card', 'Maison des Associations Démo', 'demo-budget-events-2026', NULL, 'demo@komuno.fr'),
  ('demo-expense-002', 'demo-fin-cat-tools', 'Abonnement outil emailing fictif', 5900, CURRENT_DATE - 3, 'card', 'Demo SaaS Email', 'demo-budget-tools-2026', NULL, 'demo@komuno.fr'),
  ('demo-expense-003', 'demo-fin-cat-training', 'Intervenant atelier leadership démo', 180000, CURRENT_DATE + 18, 'transfer', 'Cabinet Formation Démo', 'demo-budget-training-q3-2026', NULL, 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, description = EXCLUDED.description, amount_in_cents = EXCLUDED.amount_in_cents, expense_date = EXCLUDED.expense_date, payment_method = EXCLUDED.payment_method, vendor = EXCLUDED.vendor, budget_id = EXCLUDED.budget_id, receipt_url = EXCLUDED.receipt_url, created_by = EXCLUDED.created_by, updated_at = NOW();

INSERT INTO financial_forecasts (id, category, period, year, month, quarter, forecasted_amount_in_cents, confidence, based_on, notes, created_by)
VALUES
  ('demo-forecast-001', 'demo-fin-cat-membership', 'year', 2026, NULL, NULL, 980000, 'high', 'historical', 'Projection fictive des cotisations annuelles.', 'demo@komuno.fr'),
  ('demo-forecast-002', 'demo-fin-cat-sponsorship', 'quarter', 2026, NULL, 3, 260000, 'medium', 'estimate', 'Prévision fictive des partenaires événementiels.', 'demo@komuno.fr'),
  ('demo-forecast-003', 'demo-fin-cat-events', 'month', 2026, 9, NULL, 140000, 'medium', 'estimate', 'Dépenses prévisionnelles pour l’afterwork.', 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, period = EXCLUDED.period, year = EXCLUDED.year, month = EXCLUDED.month, quarter = EXCLUDED.quarter, forecasted_amount_in_cents = EXCLUDED.forecasted_amount_in_cents, confidence = EXCLUDED.confidence, based_on = EXCLUDED.based_on, notes = EXCLUDED.notes, created_by = EXCLUDED.created_by, updated_at = NOW();

INSERT INTO financial_revenues (id, type, description, amount_in_cents, revenue_date, member_email, patron_id, payment_method, status, receipt_url, notes, created_by)
VALUES
  ('demo-revenue-001', 'subscription', 'Cotisation annuelle Alice Martin', 24000, CURRENT_DATE - 40, 'alice.martin@example.org', NULL, 'card', 'confirmed', NULL, 'Recette fictive liée à une adhésion.', 'demo@komuno.fr'),
  ('demo-revenue-002', 'subscription', 'Cotisation bienfaiteur Hugo Bernard', 50000, CURRENT_DATE - 35, 'hugo.bernard@example.org', NULL, 'transfer', 'confirmed', NULL, 'Recette fictive bienfaiteur.', 'demo@komuno.fr'),
  ('demo-revenue-003', 'sponsorship', 'Sponsoring Demo Banque', 75000, CURRENT_DATE - 9, NULL, 'demo-patron-001', 'transfer', 'confirmed', NULL, 'Recette fictive sponsor événement.', 'demo@komuno.fr'),
  ('demo-revenue-004', 'event', 'Participation atelier commission événements', 18000, CURRENT_DATE - 2, 'mehdi.leroy@example.org', NULL, 'card', 'pending', NULL, 'Exemple de recette en attente.', 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, description = EXCLUDED.description, amount_in_cents = EXCLUDED.amount_in_cents, revenue_date = EXCLUDED.revenue_date, member_email = EXCLUDED.member_email, patron_id = EXCLUDED.patron_id, payment_method = EXCLUDED.payment_method, status = EXCLUDED.status, notes = EXCLUDED.notes, created_by = EXCLUDED.created_by, updated_at = NOW();

-- Event operations: plan, lots, suppliers, quotes, commitments, objectives, lines linked to finance.
INSERT INTO event_operation_plans (id, event_id, status, owner_email, summary, due_date, risk_level, notes, created_by, updated_by)
VALUES
  ('demo-ops-plan-001', 'demo-event-001', 'planning', 'animation@demo.komuno.org', 'Plan fictif pour piloter prestataires, objectifs et budget du petit-déjeuner.', CURRENT_DATE + 10, 'normal', 'Données démo non contractuelles.', 'demo@komuno.fr', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, owner_email = EXCLUDED.owner_email, summary = EXCLUDED.summary, due_date = EXCLUDED.due_date, risk_level = EXCLUDED.risk_level, notes = EXCLUDED.notes, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO event_workstreams (id, event_id, name, description, category, status, owner_email, due_date, priority, order_index, created_by, updated_by)
VALUES
  ('demo-workstream-venue', 'demo-event-001', 'Lieu et accueil', 'Réserver la salle, signalétique et accueil.', 'logistics', 'in_progress', 'animation@demo.komuno.org', CURRENT_DATE + 6, 1, 1, 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-workstream-catering', 'demo-event-001', 'Petit-déjeuner', 'Choisir le traiteur et confirmer les quantités.', 'supplier', 'in_progress', 'hugo.bernard@example.org', CURRENT_DATE + 8, 2, 2, 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-workstream-comms', 'demo-event-001', 'Communication', 'Envoyer les rappels et préparer le visuel.', 'communication', 'todo', 'alice.martin@example.org', CURRENT_DATE + 5, 2, 3, 'demo@komuno.fr', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, status = EXCLUDED.status, owner_email = EXCLUDED.owner_email, due_date = EXCLUDED.due_date, priority = EXCLUDED.priority, order_index = EXCLUDED.order_index, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO event_supplier_candidates (id, event_id, workstream_id, name, category, contact_name, contact_email, contact_phone, website, status, rating, notes, selected_at, created_by, updated_by)
VALUES
  ('demo-supplier-venue-001', 'demo-event-001', 'demo-workstream-venue', 'Maison des Associations Démo', 'venue', 'Claire Accueil', 'claire.accueil@example.org', '03 00 00 00 01', 'https://example.org/maison-associations', 'selected', 5, 'Lieu fictif déjà retenu.', NOW() - INTERVAL '6 days', 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-supplier-catering-001', 'demo-event-001', 'demo-workstream-catering', 'Traiteur Démo Local', 'catering', 'Paul Traiteur', 'paul.traiteur@example.org', '03 00 00 00 02', 'https://example.org/traiteur-demo', 'quoted', 4, 'Devis reçu, à confirmer.', NULL, 'demo@komuno.fr', 'hugo.bernard@example.org')
ON CONFLICT (id) DO UPDATE SET workstream_id = EXCLUDED.workstream_id, name = EXCLUDED.name, category = EXCLUDED.category, contact_name = EXCLUDED.contact_name, contact_email = EXCLUDED.contact_email, contact_phone = EXCLUDED.contact_phone, website = EXCLUDED.website, status = EXCLUDED.status, rating = EXCLUDED.rating, notes = EXCLUDED.notes, selected_at = EXCLUDED.selected_at, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO event_supplier_quotes (id, event_id, supplier_id, workstream_id, title, amount_in_cents, currency, status, valid_until, document_url, terms, notes, created_by, updated_by)
VALUES
  ('demo-quote-venue-001', 'demo-event-001', 'demo-supplier-venue-001', 'demo-workstream-venue', 'Location salle matinée', 28000, 'EUR', 'accepted', CURRENT_DATE + 20, NULL, 'Annulation sans frais à J-5.', 'Devis fictif accepté.', 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-quote-catering-001', 'demo-event-001', 'demo-supplier-catering-001', 'demo-workstream-catering', 'Formule café croissants 35 personnes', 42000, 'EUR', 'received', CURRENT_DATE + 12, NULL, 'Acompte 30%.', 'À arbitrer selon inscriptions.', 'demo@komuno.fr', 'hugo.bernard@example.org')
ON CONFLICT (id) DO UPDATE SET supplier_id = EXCLUDED.supplier_id, workstream_id = EXCLUDED.workstream_id, title = EXCLUDED.title, amount_in_cents = EXCLUDED.amount_in_cents, status = EXCLUDED.status, valid_until = EXCLUDED.valid_until, terms = EXCLUDED.terms, notes = EXCLUDED.notes, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO event_supplier_commitments (id, event_id, supplier_id, quote_id, workstream_id, title, committed_amount_in_cents, actual_amount_in_cents, currency, status, due_date, paid_at, notes, created_by, updated_by)
VALUES
  ('demo-commitment-venue-001', 'demo-event-001', 'demo-supplier-venue-001', 'demo-quote-venue-001', 'demo-workstream-venue', 'Réservation salle', 28000, 28000, 'EUR', 'confirmed', CURRENT_DATE + 8, NOW() - INTERVAL '2 days', 'Engagement fictif payé.', 'demo@komuno.fr', 'animation@demo.komuno.org')
ON CONFLICT (id) DO UPDATE SET supplier_id = EXCLUDED.supplier_id, quote_id = EXCLUDED.quote_id, workstream_id = EXCLUDED.workstream_id, title = EXCLUDED.title, committed_amount_in_cents = EXCLUDED.committed_amount_in_cents, actual_amount_in_cents = EXCLUDED.actual_amount_in_cents, status = EXCLUDED.status, due_date = EXCLUDED.due_date, paid_at = EXCLUDED.paid_at, notes = EXCLUDED.notes, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO event_objectives (id, event_id, type, label, target_value, current_value, unit, status, notes, created_by, updated_by)
VALUES
  ('demo-objective-attendees-001', 'demo-event-001', 'attendance', 'Atteindre 30 participants', 30, 2, 'participants', 'tracking', 'Objectif alimenté par les inscriptions démo.', 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-objective-sponsors-001', 'demo-event-001', 'finance', 'Sécuriser 750 € de sponsoring', 75000, 75000, 'cents', 'done', 'Sponsoring Demo Banque confirmé.', 'demo@komuno.fr', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, label = EXCLUDED.label, target_value = EXCLUDED.target_value, current_value = EXCLUDED.current_value, unit = EXCLUDED.unit, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO event_budget_lines (id, event_id, workstream_id, supplier_id, quote_id, commitment_id, financial_budget_id, financial_expense_id, financial_revenue_id, type, label, category, planned_amount_in_cents, committed_amount_in_cents, actual_amount_in_cents, currency, status, notes, created_by, updated_by)
VALUES
  ('demo-event-budget-expense-001', 'demo-event-001', 'demo-workstream-venue', 'demo-supplier-venue-001', 'demo-quote-venue-001', 'demo-commitment-venue-001', 'demo-budget-events-2026', 'demo-expense-001', NULL, 'expense', 'Location salle', 'venue', 30000, 28000, 28000, 'EUR', 'actual', 'Synchronisé avec dépense fictive.', 'demo@komuno.fr', 'animation@demo.komuno.org'),
  ('demo-event-budget-expense-002', 'demo-event-001', 'demo-workstream-catering', 'demo-supplier-catering-001', 'demo-quote-catering-001', NULL, 'demo-budget-events-2026', NULL, NULL, 'expense', 'Traiteur petit-déjeuner', 'catering', 45000, 42000, 0, 'EUR', 'committed', 'Devis reçu, engagement à confirmer.', 'demo@komuno.fr', 'hugo.bernard@example.org'),
  ('demo-event-budget-revenue-001', 'demo-event-001', NULL, NULL, NULL, NULL, NULL, NULL, 'demo-revenue-003', 'income', 'Sponsoring Demo Banque', 'sponsorship', 75000, 75000, 75000, 'EUR', 'actual', 'Recette fictive liée au sponsor.', 'demo@komuno.fr', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET workstream_id = EXCLUDED.workstream_id, supplier_id = EXCLUDED.supplier_id, quote_id = EXCLUDED.quote_id, commitment_id = EXCLUDED.commitment_id, financial_budget_id = EXCLUDED.financial_budget_id, financial_expense_id = EXCLUDED.financial_expense_id, financial_revenue_id = EXCLUDED.financial_revenue_id, type = EXCLUDED.type, label = EXCLUDED.label, category = EXCLUDED.category, planned_amount_in_cents = EXCLUDED.planned_amount_in_cents, committed_amount_in_cents = EXCLUDED.committed_amount_in_cents, actual_amount_in_cents = EXCLUDED.actual_amount_in_cents, status = EXCLUDED.status, notes = EXCLUDED.notes, updated_by = EXCLUDED.updated_by, updated_at = NOW();

-- Explicit federation/syndication demo rows. No PII/finance sync.
INSERT INTO event_syndications (id, event_id, source_organization_id, target_organization_id, direction, status, include_in_agenda, local_title_override, created_by, reviewed_by, reviewed_at, target_instance_url, remote_event_id, remote_syndication_id, sync_status, sync_attempts)
VALUES
  ('demo-event-syndication-001', 'demo-event-001', 'demo-region-org', 'demo-org', 'pull', 'accepted', true, 'Petit-déjeuner nouveaux membres — démo locale', 'demo@komuno.fr', 'animation@demo.komuno.org', NOW() - INTERVAL '4 days', 'https://demo.komuno.org', 'remote-demo-event-001', 'remote-demo-syndication-001', 'local', 0)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, include_in_agenda = EXCLUDED.include_in_agenda, local_title_override = EXCLUDED.local_title_override, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at, target_instance_url = EXCLUDED.target_instance_url, remote_event_id = EXCLUDED.remote_event_id, remote_syndication_id = EXCLUDED.remote_syndication_id, sync_status = EXCLUDED.sync_status, updated_at = NOW();

-- Forms/surveys.
INSERT INTO survey_forms (id, slug, title, description, status, collect_respondent_info, allow_multiple_submissions, success_message, created_by, published_at, version, require_consent, consent_text, retention_days, organization_id, origin_organization_id, source_form_id, source_instance_url, federation_visibility, federation_status, is_federated_copy, canonical_form_id)
VALUES
  ('demo-form-001', 'questionnaire-satisfaction-demo', 'Questionnaire satisfaction événement', 'Formulaire fictif pour tester questions, réponses, synthèses et fédération.', 'published', true, true, 'Merci pour votre réponse de démonstration.', 'demo@komuno.fr', NOW() - INTERVAL '6 days', 2, true, 'J’accepte que mes réponses de démonstration soient utilisées pour la démo Komuno.', 90, 'demo-org', 'demo-org', NULL, 'https://demo.komuno.org', 'regional', 'published', false, NULL)
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, collect_respondent_info = EXCLUDED.collect_respondent_info, success_message = EXCLUDED.success_message, version = EXCLUDED.version, require_consent = EXCLUDED.require_consent, consent_text = EXCLUDED.consent_text, retention_days = EXCLUDED.retention_days, organization_id = EXCLUDED.organization_id, federation_visibility = EXCLUDED.federation_visibility, federation_status = EXCLUDED.federation_status, updated_at = NOW();

INSERT INTO survey_questions (id, form_id, label, description, type, required, options, validation, order_index)
VALUES
  ('demo-question-001', 'demo-form-001', 'Quel est votre niveau de satisfaction ?', 'Note de 1 à 5.', 'rating', true, '[1,2,3,4,5]'::jsonb, '{"min":1,"max":5}'::jsonb, 1),
  ('demo-question-002', 'demo-form-001', 'Quel sujet voulez-vous approfondir ?', NULL, 'select', false, '["Mentorat","Finance","Événements","Formations"]'::jsonb, '{}'::jsonb, 2),
  ('demo-question-003', 'demo-form-001', 'Commentaire libre', NULL, 'textarea', false, '[]'::jsonb, '{"maxLength":800}'::jsonb, 3)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, type = EXCLUDED.type, required = EXCLUDED.required, options = EXCLUDED.options, validation = EXCLUDED.validation, order_index = EXCLUDED.order_index, updated_at = NOW();

INSERT INTO survey_responses (id, form_id, respondent_name, respondent_email, answers, submitted_at, form_version, form_snapshot, consent_accepted)
VALUES
  ('demo-response-001', 'demo-form-001', 'Alice Martin', 'alice.martin@example.org', '{"demo-question-001":5,"demo-question-002":"Mentorat","demo-question-003":"Très clair pour une démo."}'::jsonb, NOW() - INTERVAL '2 days', 2, '{"title":"Questionnaire satisfaction événement","version":2}'::jsonb, true),
  ('demo-response-002', 'demo-form-001', 'Hugo Bernard', 'hugo.bernard@example.org', '{"demo-question-001":4,"demo-question-002":"Événements","demo-question-003":"Ajouter une relance automatique."}'::jsonb, NOW() - INTERVAL '1 day', 2, '{"title":"Questionnaire satisfaction événement","version":2}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET respondent_name = EXCLUDED.respondent_name, respondent_email = EXCLUDED.respondent_email, answers = EXCLUDED.answers, submitted_at = EXCLUDED.submitted_at, form_version = EXCLUDED.form_version, form_snapshot = EXCLUDED.form_snapshot, consent_accepted = EXCLUDED.consent_accepted;

INSERT INTO survey_form_syndications (id, form_id, source_organization_id, target_organization_id, direction, status, include_responses, collect_responses_locally, local_title_override, created_by, reviewed_by, reviewed_at, target_instance_url, remote_form_id, remote_syndication_id, sync_status, sync_attempts)
VALUES
  ('demo-form-syndication-001', 'demo-form-001', 'demo-region-org', 'demo-org', 'pull', 'accepted', false, true, 'Questionnaire satisfaction — section démo', 'demo@komuno.fr', 'animation@demo.komuno.org', NOW() - INTERVAL '2 days', 'https://demo.komuno.org', 'remote-demo-form-001', 'remote-demo-form-syndication-001', 'local', 0)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, include_responses = EXCLUDED.include_responses, collect_responses_locally = EXCLUDED.collect_responses_locally, local_title_override = EXCLUDED.local_title_override, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at, target_instance_url = EXCLUDED.target_instance_url, remote_form_id = EXCLUDED.remote_form_id, remote_syndication_id = EXCLUDED.remote_syndication_id, sync_status = EXCLUDED.sync_status, updated_at = NOW();

INSERT INTO survey_form_response_summaries (id, syndication_id, form_id, remote_form_id, source_organization_id, target_organization_id, source_instance_url, response_count, last_response_at, responses_by_day, question_summaries, metadata)
VALUES
  ('demo-form-summary-001', 'demo-form-syndication-001', 'demo-form-001', 'remote-demo-form-001', 'demo-region-org', 'demo-org', 'https://demo.komuno.org', 2, NOW() - INTERVAL '1 day', '[{"date":"2026-07-01","count":1},{"date":"2026-07-02","count":1}]'::jsonb, '[{"question":"Satisfaction","average":4.5},{"question":"Sujet","top":"Mentorat"}]'::jsonb, '{"demo":true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET response_count = EXCLUDED.response_count, last_response_at = EXCLUDED.last_response_at, responses_by_day = EXCLUDED.responses_by_day, question_summaries = EXCLUDED.question_summaries, metadata = EXCLUDED.metadata, updated_at = NOW();

-- Trainings.
INSERT INTO training_programs (id, organization_id, origin_organization_id, source_instance_url, source_training_id, slug, title, description, category, audience, objectives, status, federation_visibility, federation_status, version, is_federated_copy, canonical_training_id, created_by, updated_by)
VALUES
  ('demo-training-001', 'demo-org', 'demo-org', 'https://demo.komuno.org', NULL, 'leadership-associatif-demo', 'Leadership associatif', 'Programme fictif pour tester catalogue, sessions et intérêts.', 'management', 'Dirigeants associatifs', '["Structurer une réunion", "Animer un collectif", "Suivre un plan d’action"]'::jsonb, 'published', 'regional', 'published', 1, false, NULL, 'demo@komuno.fr', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category, audience = EXCLUDED.audience, objectives = EXCLUDED.objectives, status = EXCLUDED.status, federation_visibility = EXCLUDED.federation_visibility, federation_status = EXCLUDED.federation_status, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO training_sessions (id, training_id, source_session_id, starts_at, ends_at, location_name, location_address, city, capacity, status)
VALUES
  ('demo-training-session-001', 'demo-training-001', NULL, NOW() + INTERVAL '21 days', NOW() + INTERVAL '21 days 3 hours', 'Campus Démo', '1 rue de la Démo', 'Amiens', 18, 'scheduled'),
  ('demo-training-session-002', 'demo-training-001', NULL, NOW() + INTERVAL '49 days', NOW() + INTERVAL '49 days 3 hours', 'Visio Komuno', NULL, 'À distance', 25, 'scheduled')
ON CONFLICT (id) DO UPDATE SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, location_name = EXCLUDED.location_name, location_address = EXCLUDED.location_address, city = EXCLUDED.city, capacity = EXCLUDED.capacity, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO training_interests (id, training_id, session_id, respondent_name, respondent_email, company, phone, member_email, source_organization_id, source_instance_url, source_interest_id, consent_accepted, message, status, synced_to_region_at)
VALUES
  ('demo-training-interest-001', 'demo-training-001', 'demo-training-session-001', 'Alice Martin', 'alice.martin@example.org', 'Atelier Martin', '06 00 00 00 01', 'alice.martin@example.org', 'demo-org', 'https://demo.komuno.org', NULL, true, 'Intéressée par l’animation de commission.', 'new', NULL),
  ('demo-training-interest-002', 'demo-training-001', 'demo-training-session-002', 'Sarah Durand', 'sarah.durand@example.org', 'Durand Tech', '06 00 00 00 03', 'sarah.durand@example.org', 'demo-org', 'https://demo.komuno.org', NULL, true, 'Préférence pour la visio.', 'contacted', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET session_id = EXCLUDED.session_id, respondent_name = EXCLUDED.respondent_name, respondent_email = EXCLUDED.respondent_email, company = EXCLUDED.company, phone = EXCLUDED.phone, member_email = EXCLUDED.member_email, consent_accepted = EXCLUDED.consent_accepted, message = EXCLUDED.message, status = EXCLUDED.status, synced_to_region_at = EXCLUDED.synced_to_region_at, updated_at = NOW();

INSERT INTO training_sync_runs (id, direction, status, source_organization_id, target_organization_id, relation_id, pushed_count, pulled_count, skipped_count, error_count, error, metadata, started_at, finished_at)
VALUES
  ('demo-training-sync-001', 'push', 'success', 'demo-org', 'demo-region-org', 'demo-relation-region-section', 2, 0, 0, 0, NULL, '{"demo":true,"scope":"training_interests"}'::jsonb, NOW() - INTERVAL '1 day 1 hour', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET direction = EXCLUDED.direction, status = EXCLUDED.status, source_organization_id = EXCLUDED.source_organization_id, target_organization_id = EXCLUDED.target_organization_id, relation_id = EXCLUDED.relation_id, pushed_count = EXCLUDED.pushed_count, pulled_count = EXCLUDED.pulled_count, skipped_count = EXCLUDED.skipped_count, error_count = EXCLUDED.error_count, metadata = EXCLUDED.metadata, started_at = EXCLUDED.started_at, finished_at = EXCLUDED.finished_at;

-- Integrations and automations. Secrets are intentionally absent/redacted.
INSERT INTO integration_accounts (id, provider, label, organization_id, status, auth_type, scopes, settings, secret_fingerprint, secret_encrypted, secret_encrypted_payload, secret_encryption_key_id, secret_encrypted_at, last_sync_at, last_error, enabled, created_by)
VALUES
  ('demo-integration-webhook-001', 'outbound_webhook', 'Webhook Make démo', 'demo-org', 'connected', 'hmac', '["event.created","member.created","form.response.created"]'::jsonb, '{"url":"https://example.org/webhooks/komuno-demo","secret":"***redacted***"}'::jsonb, 'demo-secret-fp-webhook', true, NULL, NULL, NULL, NOW() - INTERVAL '2 hours', NULL, true, 'demo@komuno.fr'),
  ('demo-integration-stripe-001', 'stripe', 'Stripe test démo', 'demo-org', 'needs_configuration', 'api_key', '["checkout","webhooks"]'::jsonb, '{"mode":"test","publishableKeyConfigured":false}'::jsonb, NULL, false, NULL, NULL, NULL, NULL, 'Configuration fictive sans secret.', false, 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET provider = EXCLUDED.provider, label = EXCLUDED.label, organization_id = EXCLUDED.organization_id, status = EXCLUDED.status, auth_type = EXCLUDED.auth_type, scopes = EXCLUDED.scopes, settings = EXCLUDED.settings, secret_fingerprint = EXCLUDED.secret_fingerprint, secret_encrypted = EXCLUDED.secret_encrypted, secret_encrypted_payload = NULL, secret_encryption_key_id = NULL, secret_encrypted_at = NULL, last_sync_at = EXCLUDED.last_sync_at, last_error = EXCLUDED.last_error, enabled = EXCLUDED.enabled, updated_at = NOW();

INSERT INTO integration_sync_runs (id, account_id, provider, operation, status, started_at, finished_at, pulled_count, pushed_count, skipped_count, error_count, error, metadata)
VALUES
  ('demo-integration-sync-001', 'demo-integration-webhook-001', 'outbound_webhook', 'delivery_retry', 'success', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '119 minutes', 0, 3, 0, 0, NULL, '{"demo":true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id, provider = EXCLUDED.provider, operation = EXCLUDED.operation, status = EXCLUDED.status, started_at = EXCLUDED.started_at, finished_at = EXCLUDED.finished_at, pulled_count = EXCLUDED.pulled_count, pushed_count = EXCLUDED.pushed_count, skipped_count = EXCLUDED.skipped_count, error_count = EXCLUDED.error_count, error = EXCLUDED.error, metadata = EXCLUDED.metadata;

INSERT INTO integration_webhook_events (id, provider, account_id, external_event_id, event_type, payload_hash, payload, status, processed_at, retry_count, error, received_at)
VALUES
  ('demo-integration-event-001', 'stripe', 'demo-integration-stripe-001', 'evt_demo_checkout_completed', 'checkout.session.completed', 'sha256-demo-checkout', '{"id":"evt_demo_checkout_completed","livemode":false,"demo":true}'::jsonb, 'processed', NOW() - INTERVAL '3 hours', 0, NULL, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO UPDATE SET provider = EXCLUDED.provider, account_id = EXCLUDED.account_id, external_event_id = EXCLUDED.external_event_id, event_type = EXCLUDED.event_type, payload_hash = EXCLUDED.payload_hash, payload = EXCLUDED.payload, status = EXCLUDED.status, processed_at = EXCLUDED.processed_at, retry_count = EXCLUDED.retry_count, error = EXCLUDED.error, received_at = EXCLUDED.received_at;

INSERT INTO integration_outbound_webhook_deliveries (id, account_id, event_id, event_type, payload_hash, payload, status, attempt_count, max_attempts, next_attempt_at, last_attempt_at, delivered_at, response_status, response_body, error)
VALUES
  ('demo-webhook-delivery-001', 'demo-integration-webhook-001', 'demo-event-created-001', 'event.created', 'sha256-demo-event-created', '{"eventId":"demo-event-001","demo":true}'::jsonb, 'delivered', 1, 3, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', 200, 'OK demo', NULL),
  ('demo-webhook-delivery-002', 'demo-integration-webhook-001', 'demo-budget-threshold-001', 'event_ops.budget.threshold_exceeded', 'sha256-demo-budget-threshold', '{"eventId":"demo-event-001","threshold":0.8,"demo":true}'::jsonb, 'pending', 0, 3, NOW() + INTERVAL '15 minutes', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id, event_id = EXCLUDED.event_id, event_type = EXCLUDED.event_type, payload_hash = EXCLUDED.payload_hash, payload = EXCLUDED.payload, status = EXCLUDED.status, attempt_count = EXCLUDED.attempt_count, max_attempts = EXCLUDED.max_attempts, next_attempt_at = EXCLUDED.next_attempt_at, last_attempt_at = EXCLUDED.last_attempt_at, delivered_at = EXCLUDED.delivered_at, response_status = EXCLUDED.response_status, response_body = EXCLUDED.response_body, error = EXCLUDED.error, updated_at = NOW();

INSERT INTO automation_workflows (id, organization_id, name, description, status, trigger_type, draft_definition, current_version, created_by, updated_by)
VALUES
  ('demo-automation-workflow-001', 'demo-org', 'Relance inscriptions événement', 'Workflow fictif de relance avant événement.', 'active', 'event.created', '{"conditions":[{"field":"event.status","operator":"eq","value":"published"}],"steps":[{"id":"notify-admin","type":"notification","config":{"title":"Nouvel événement publié"}}]}'::jsonb, 1, 'demo@komuno.fr', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status, trigger_type = EXCLUDED.trigger_type, draft_definition = EXCLUDED.draft_definition, current_version = EXCLUDED.current_version, updated_by = EXCLUDED.updated_by, updated_at = NOW();

INSERT INTO automation_workflow_versions (id, workflow_id, version, trigger_type, definition_hash, definition, published_by, published_at)
VALUES
  ('demo-automation-version-001', 'demo-automation-workflow-001', 1, 'event.created', 'sha256-demo-automation-v1', '{"steps":[{"id":"notify-admin","type":"notification"}],"demo":true}'::jsonb, 'demo@komuno.fr', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO UPDATE SET workflow_id = EXCLUDED.workflow_id, version = EXCLUDED.version, trigger_type = EXCLUDED.trigger_type, definition_hash = EXCLUDED.definition_hash, definition = EXCLUDED.definition, published_by = EXCLUDED.published_by, published_at = EXCLUDED.published_at;

INSERT INTO automation_events (id, event_type, event_id, organization_id, source, payload_hash, payload, received_at)
VALUES
  ('demo-automation-event-001', 'event.created', 'demo-event-001', 'demo-org', 'internal', 'sha256-demo-automation-event', '{"eventId":"demo-event-001","title":"Petit-déjeuner nouveaux membres"}'::jsonb, NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO UPDATE SET event_type = EXCLUDED.event_type, event_id = EXCLUDED.event_id, organization_id = EXCLUDED.organization_id, source = EXCLUDED.source, payload_hash = EXCLUDED.payload_hash, payload = EXCLUDED.payload, received_at = EXCLUDED.received_at;

INSERT INTO automation_runs (id, workflow_id, workflow_version_id, automation_event_id, status, input, output, error, attempt_count, max_attempts, next_attempt_at, started_at, finished_at)
VALUES
  ('demo-automation-run-001', 'demo-automation-workflow-001', 'demo-automation-version-001', 'demo-automation-event-001', 'success', '{"eventId":"demo-event-001"}'::jsonb, '{"notificationId":"demo-notif-automation-001"}'::jsonb, NULL, 1, 3, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '5 seconds')
ON CONFLICT (id) DO UPDATE SET workflow_id = EXCLUDED.workflow_id, workflow_version_id = EXCLUDED.workflow_version_id, automation_event_id = EXCLUDED.automation_event_id, status = EXCLUDED.status, input = EXCLUDED.input, output = EXCLUDED.output, error = EXCLUDED.error, attempt_count = EXCLUDED.attempt_count, max_attempts = EXCLUDED.max_attempts, next_attempt_at = EXCLUDED.next_attempt_at, started_at = EXCLUDED.started_at, finished_at = EXCLUDED.finished_at, updated_at = NOW();

INSERT INTO automation_step_runs (id, run_id, step_id, step_type, status, input, output, error, started_at, finished_at)
VALUES
  ('demo-automation-step-001', 'demo-automation-run-001', 'notify-admin', 'notification', 'success', '{"title":"Nouvel événement publié"}'::jsonb, '{"notificationId":"demo-notif-automation-001"}'::jsonb, NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '4 seconds')
ON CONFLICT (id) DO UPDATE SET run_id = EXCLUDED.run_id, step_id = EXCLUDED.step_id, step_type = EXCLUDED.step_type, status = EXCLUDED.status, input = EXCLUDED.input, output = EXCLUDED.output, error = EXCLUDED.error, started_at = EXCLUDED.started_at, finished_at = EXCLUDED.finished_at;

INSERT INTO notifications (id, user_id, type, title, body, icon, is_read, metadata, entity_type, entity_id)
VALUES
  ('demo-notif-automation-001', 'demo@komuno.fr', 'automation', 'Automation exécutée', 'La relance événement fictive a été simulée avec succès.', 'zap', false, '{"demo":true}'::jsonb, 'automation_run', 'demo-automation-run-001')
ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, type = EXCLUDED.type, title = EXCLUDED.title, body = EXCLUDED.body, icon = EXCLUDED.icon, is_read = EXCLUDED.is_read, metadata = EXCLUDED.metadata, entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id, updated_at = NOW();

-- Tools/public catalogue.
INSERT INTO tool_categories (id, name, description, icon, color, "order", is_active)
VALUES
  ('demo-tool-category-crm', 'CRM & adhérents', 'Outils fictifs pour gérer les communautés.', 'users', '#62f2bd', 1, true),
  ('demo-tool-category-finance', 'Finance', 'Outils fictifs de suivi financier.', 'wallet', '#7b61ff', 2, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, color = EXCLUDED.color, "order" = EXCLUDED."order", is_active = EXCLUDED.is_active, updated_at = NOW();

INSERT INTO tools (id, category_id, name, description, logo_url, price, link, tags, is_featured, is_active, "order", created_by)
VALUES
  ('demo-tool-001', 'demo-tool-category-crm', 'Komuno Démo', 'Portail adhérents fictif utilisé pour présenter les modules.', NULL, 'Démo', 'https://demo.komuno.org', ARRAY['adhérents','événements','idées'], true, true, 1, 'demo@komuno.fr'),
  ('demo-tool-002', 'demo-tool-category-finance', 'Budget Board Démo', 'Exemple d’outil fictif relié aux budgets.', NULL, 'Gratuit en démo', 'https://example.org/budget-board-demo', ARRAY['finance','budget'], false, true, 2, 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, description = EXCLUDED.description, logo_url = EXCLUDED.logo_url, price = EXCLUDED.price, link = EXCLUDED.link, tags = EXCLUDED.tags, is_featured = EXCLUDED.is_featured, is_active = EXCLUDED.is_active, "order" = EXCLUDED."order", created_by = EXCLUDED.created_by, updated_at = NOW();

-- Tracking/development/email operational tables.
INSERT INTO tracking_alerts (id, entity_type, entity_id, entity_email, alert_type, severity, title, message, is_read, is_resolved, created_by, expires_at)
VALUES
  ('demo-tracking-alert-001', 'member', 'demo-member-003', 'sarah.durand@example.org', 'prospect_followup', 'medium', 'Relance prospect à prévoir', 'Sarah Durand n’a pas encore été qualifiée dans la démo.', false, false, 'demo@komuno.fr', NOW() + INTERVAL '7 days')
ON CONFLICT (id) DO UPDATE SET entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id, entity_email = EXCLUDED.entity_email, alert_type = EXCLUDED.alert_type, severity = EXCLUDED.severity, title = EXCLUDED.title, message = EXCLUDED.message, is_read = EXCLUDED.is_read, is_resolved = EXCLUDED.is_resolved, created_by = EXCLUDED.created_by, expires_at = EXCLUDED.expires_at;

INSERT INTO tracking_metrics (id, entity_type, entity_id, entity_email, metric_type, metric_value, metric_data, description, recorded_by, recorded_at)
VALUES
  ('demo-tracking-metric-001', 'member', 'demo-member-001', 'alice.martin@example.org', 'engagement_score', 82, '{"source":"demo","events":3}', 'Score d’engagement fictif.', 'demo@komuno.fr', NOW() - INTERVAL '1 day'),
  ('demo-tracking-metric-002', 'event', 'demo-event-001', 'animation@demo.komuno.org', 'registration_count', 2, '{"capacity":35}', 'Inscriptions démo pour événement.', 'animation@demo.komuno.org', NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO UPDATE SET entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id, entity_email = EXCLUDED.entity_email, metric_type = EXCLUDED.metric_type, metric_value = EXCLUDED.metric_value, metric_data = EXCLUDED.metric_data, description = EXCLUDED.description, recorded_by = EXCLUDED.recorded_by, recorded_at = EXCLUDED.recorded_at;

INSERT INTO development_requests (id, title, description, type, priority, requested_by, requested_by_name, github_issue_number, github_issue_url, status, github_status, admin_comment, last_status_change_by, last_synced_at)
VALUES
  ('demo-dev-request-001', 'Ajouter une vue budget par événement', 'Demande fictive pour illustrer le workflow des demandes dev.', 'feature', 'medium', 'alice.martin@example.org', 'Alice Martin', NULL, NULL, 'open', 'not_synced', 'Exemple démo sans création GitHub.', 'demo@komuno.fr', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, type = EXCLUDED.type, priority = EXCLUDED.priority, requested_by = EXCLUDED.requested_by, requested_by_name = EXCLUDED.requested_by_name, status = EXCLUDED.status, github_status = EXCLUDED.github_status, admin_comment = EXCLUDED.admin_comment, last_status_change_by = EXCLUDED.last_status_change_by, last_synced_at = EXCLUDED.last_synced_at, updated_at = NOW();

INSERT INTO email_config (id, provider, host, port, secure, from_name, from_email, updated_by, username, password)
VALUES
  (1, 'demo', 'smtp.demo.invalid', 465, true, 'Komuno Démo', 'noreply@demo.komuno.org', 'demo-seed', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET provider = EXCLUDED.provider, host = EXCLUDED.host, port = EXCLUDED.port, secure = EXCLUDED.secure, from_name = EXCLUDED.from_name, from_email = EXCLUDED.from_email, updated_by = EXCLUDED.updated_by, username = NULL, password = NULL, updated_at = NOW();

-- Safe expired/dummy operational rows, so admin screens have data without usable secrets/sessions.
INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_email)
VALUES
  ('demo-push-001', 'https://push.example.org/demo-endpoint', 'demo-public-p256dh', 'demo-auth-placeholder', 'demo@komuno.fr')
ON CONFLICT (id) DO UPDATE SET endpoint = EXCLUDED.endpoint, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_email = EXCLUDED.user_email, updated_at = NOW();

INSERT INTO password_reset_tokens (id, email, token, expires_at, used_at)
VALUES
  ('demo-password-reset-001', 'demo@komuno.fr', 'demo-expired-token-not-usable', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, used_at = EXCLUDED.used_at;

INSERT INTO user_sessions (sid, sess, expire)
VALUES
  ('demo-expired-session', '{"cookie":{"originalMaxAge":0,"expires":"2026-01-01T00:00:00.000Z","httpOnly":true,"path":"/"},"demo":true}'::json, NOW() - INTERVAL '1 day')
ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire;

INSERT INTO business_audit_logs (id, actor_email, action, entity_type, entity_id, organization_id, relation_id, metadata, ip_address, user_agent, created_at)
VALUES
  ('demo-audit-001', 'demo@komuno.fr', 'demo.seed.extended', 'demo_database', 'seed-demo-extra', 'demo-org', NULL, '{"tables":"all_application_modules","finance":true,"demo":true}'::jsonb, '127.0.0.1', 'komuno-demo-seed', NOW())
ON CONFLICT (id) DO UPDATE SET actor_email = EXCLUDED.actor_email, action = EXCLUDED.action, entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id, organization_id = EXCLUDED.organization_id, metadata = EXCLUDED.metadata, created_at = EXCLUDED.created_at;

COMMIT;
