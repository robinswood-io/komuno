-- Migration: Add member_subscriptions and financial_revenues tables
-- Purpose: Finance module refactoring for subscription and revenue tracking

-- Drop existing member_subscriptions if it exists (it's empty)
DROP TABLE IF EXISTS member_subscriptions CASCADE;

-- Create member_subscriptions table (cotisations membres)
CREATE TABLE member_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_name VARCHAR(255) NOT NULL,
  member_email VARCHAR(255) NOT NULL,
  subscription_type VARCHAR(50) NOT NULL, -- 'adherent', 'parrain', 'bienfaiteur', 'autre'
  amount_in_cents INTEGER NOT NULL,
  duration_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  payment_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'pending'
  payment_method VARCHAR(50),
  notes TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for member_subscriptions
CREATE INDEX idx_member_subscriptions_member_email ON member_subscriptions(member_email);
CREATE INDEX idx_member_subscriptions_status ON member_subscriptions(status);
CREATE INDEX idx_member_subscriptions_end_date ON member_subscriptions(end_date);

-- Create financial_revenues table (revenus hors cotisations)
CREATE TABLE IF NOT EXISTS financial_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_type VARCHAR(50) NOT NULL, -- 'donation', 'grant', 'sponsorship', 'other'
  source_name VARCHAR(255) NOT NULL,
  source_contact VARCHAR(255),
  amount_in_cents INTEGER NOT NULL,
  category_id VARCHAR REFERENCES financial_categories(id),
  received_date DATE NOT NULL,
  payment_method VARCHAR(50),
  receipt_url TEXT,
  notes TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for financial_revenues
CREATE INDEX IF NOT EXISTS idx_financial_revenues_revenue_type ON financial_revenues(revenue_type);
CREATE INDEX IF NOT EXISTS idx_financial_revenues_received_date ON financial_revenues(received_date);
CREATE INDEX IF NOT EXISTS idx_financial_revenues_category ON financial_revenues(category_id);
