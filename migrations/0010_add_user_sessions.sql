-- Migration 0010: Créer la table user_sessions pour express-session (connect-pg-simple)
-- Cette table était absente des migrations et devait être créée manuellement.
-- Sans cette table, les sessions ne peuvent pas être sauvegardées et le login échoue.

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "idx_session_expire" ON "user_sessions" ("expire");
