-- Migration: Add subscription types system
-- This creates a template/type system for subscriptions

-- 1. Create subscription_types table
CREATE TABLE IF NOT EXISTS subscription_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  amount_in_cents INTEGER NOT NULL CHECK (amount_in_cents >= 0),
  duration_type VARCHAR(20) NOT NULL CHECK (duration_type IN ('monthly', 'quarterly', 'yearly')),

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_types_active ON subscription_types(is_active);
CREATE INDEX idx_subscription_types_name ON subscription_types(name);

-- 2. Add subscription_type_id to member_subscriptions
ALTER TABLE member_subscriptions
  ADD COLUMN IF NOT EXISTS subscription_type_id UUID REFERENCES subscription_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_type ON member_subscriptions(subscription_type_id);

-- 3. Make subscription_type optional (was required, now can be NULL for new system)
ALTER TABLE member_subscriptions
  ALTER COLUMN subscription_type DROP NOT NULL;

-- 4. Insert default subscription types
INSERT INTO subscription_types (name, description, amount_in_cents, duration_type, is_active)
VALUES
  ('Adhérent Standard', 'Cotisation adhérent annuelle standard', 15000, 'yearly', true),
  ('Parrain', 'Cotisation parrain annuelle', 50000, 'yearly', true),
  ('Bienfaiteur', 'Cotisation bienfaiteur annuelle', 100000, 'yearly', true),
  ('Adhérent Trimestriel', 'Cotisation adhérent trimestrielle', 5000, 'quarterly', true)
ON CONFLICT (name) DO NOTHING;

-- 5. Link existing subscriptions to types (migration de données)
-- Pour chaque combinaison unique (subscription_type, duration_type, amount) dans member_subscriptions,
-- créer un type si pas déjà existant, puis lier
DO $$
DECLARE
  sub RECORD;
  type_id UUID;
BEGIN
  FOR sub IN
    SELECT DISTINCT subscription_type, duration_type, amount_in_cents
    FROM member_subscriptions
    WHERE subscription_type IS NOT NULL
      AND subscription_type_id IS NULL
  LOOP
    -- Check if a matching type exists
    SELECT id INTO type_id
    FROM subscription_types
    WHERE amount_in_cents = sub.amount_in_cents
      AND duration_type = sub.duration_type
    LIMIT 1;

    -- If no matching type, create one
    IF type_id IS NULL THEN
      INSERT INTO subscription_types (name, amount_in_cents, duration_type, is_active)
      VALUES (
        CONCAT(sub.subscription_type, ' (', sub.amount_in_cents / 100, '€/', sub.duration_type, ')'),
        sub.amount_in_cents,
        sub.duration_type,
        false  -- Mark as inactive (legacy)
      )
      RETURNING id INTO type_id;
    END IF;

    -- Link subscriptions to this type
    UPDATE member_subscriptions
    SET subscription_type_id = type_id
    WHERE subscription_type = sub.subscription_type
      AND duration_type = sub.duration_type
      AND amount_in_cents = sub.amount_in_cents
      AND subscription_type_id IS NULL;
  END LOOP;
END $$;

-- 6. Verification
DO $$
DECLARE
  total_subs INTEGER;
  linked_subs INTEGER;
  total_types INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_subs FROM member_subscriptions;
  SELECT COUNT(*) INTO linked_subs FROM member_subscriptions WHERE subscription_type_id IS NOT NULL;
  SELECT COUNT(*) INTO total_types FROM subscription_types WHERE is_active = true;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Total subscriptions: %', total_subs;
  RAISE NOTICE '  - Linked to types: %', linked_subs;
  RAISE NOTICE '  - Active types available: %', total_types;
END $$;
