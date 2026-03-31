-- Script SQL pour ajouter des relations de test
-- Execute avec: docker exec -i postgres psql -U cjd80_user -d cjd80_db < scripts/add-test-relations.sql

-- Nettoyer les relations de test existantes (optionnel)
-- DELETE FROM member_relations WHERE created_by = 'test-script';

-- Récupérer quelques emails de membres pour créer des relations
DO $$
DECLARE
  member_emails TEXT[];
  i INTEGER;
BEGIN
  -- Récupérer les 20 premiers membres actifs
  SELECT ARRAY_AGG(email ORDER BY email)
  INTO member_emails
  FROM (SELECT email FROM members WHERE status = 'active' LIMIT 20) AS subquery;

  IF array_length(member_emails, 1) < 3 THEN
    RAISE NOTICE 'Pas assez de membres (minimum 3)';
    RETURN;
  END IF;

  RAISE NOTICE 'Création de relations pour % membres', array_length(member_emails, 1);

  -- Pattern 1: Chaîne de parrainages (5 relations)
  FOR i IN 1..LEAST(5, array_length(member_emails, 1) - 1) LOOP
    INSERT INTO member_relations (member_email, related_member_email, relation_type, description, created_by, created_at)
    VALUES (
      member_emails[i],
      member_emails[i + 1],
      'sponsor',
      'Parrainage - relation de test',
      'test-script',
      NOW()
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Pattern 2: Équipes (groupes de 3)
  IF array_length(member_emails, 1) >= 8 THEN
    INSERT INTO member_relations (member_email, related_member_email, relation_type, description, created_by, created_at)
    VALUES
      (member_emails[6], member_emails[7], 'team', 'Équipe projet', 'test-script', NOW()),
      (member_emails[7], member_emails[8], 'team', 'Équipe projet', 'test-script', NOW()),
      (member_emails[6], member_emails[8], 'team', 'Équipe projet', 'test-script', NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Pattern 3: Hub central (1 membre connecté à 3 autres)
  IF array_length(member_emails, 1) >= 13 THEN
    FOR i IN 12..14 LOOP
      INSERT INTO member_relations (member_email, related_member_email, relation_type, description, created_by, created_at)
      VALUES (
        member_emails[11],
        member_emails[i],
        'custom',
        'Relation professionnelle',
        'test-script',
        NOW()
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Pattern 4: Connexions croisées
  IF array_length(member_emails, 1) >= 15 THEN
    INSERT INTO member_relations (member_email, related_member_email, relation_type, description, created_by, created_at)
    VALUES
      (member_emails[3], member_emails[9], 'custom', 'Anciens collègues', 'test-script', NOW()),
      (member_emails[4], member_emails[13], 'sponsor', 'Parrainage croisé', 'test-script', NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Relations de test créées avec succès';
END $$;

-- Afficher le résumé
SELECT
  'Total relations' AS metric,
  COUNT(*)::text AS value
FROM member_relations
UNION ALL
SELECT
  relation_type,
  COUNT(*)::text
FROM member_relations
GROUP BY relation_type
ORDER BY metric;
