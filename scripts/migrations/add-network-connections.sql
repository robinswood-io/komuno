-- Migration: Réseau - Connexions entre membres et mécènes
-- Date: 2026-02-27

CREATE TABLE IF NOT EXISTS network_connections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('member', 'patron')),
  connected_email TEXT NOT NULL,
  connected_type TEXT NOT NULL CHECK (connected_type IN ('member', 'patron')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT,
  CONSTRAINT network_connections_unique UNIQUE (owner_email, connected_email)
);

CREATE INDEX IF NOT EXISTS network_connections_owner_email_idx ON network_connections(owner_email);
CREATE INDEX IF NOT EXISTS network_connections_connected_email_idx ON network_connections(connected_email);
