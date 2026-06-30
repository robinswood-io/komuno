-- 0031_add_outbound_webhook_deliveries.sql
-- Journal des webhooks sortants (Make / n8n / Zapier) avec idempotence, retry et audit.

CREATE TABLE IF NOT EXISTS integration_outbound_webhook_deliveries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id VARCHAR REFERENCES integration_accounts(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMP,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_account_event_unique
  ON integration_outbound_webhook_deliveries(account_id, event_id);
CREATE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_account_idx
  ON integration_outbound_webhook_deliveries(account_id);
CREATE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_event_type_idx
  ON integration_outbound_webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_status_idx
  ON integration_outbound_webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_next_attempt_idx
  ON integration_outbound_webhook_deliveries(next_attempt_at);
CREATE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_created_at_idx
  ON integration_outbound_webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS integration_outbound_webhook_deliveries_payload_gin_idx
  ON integration_outbound_webhook_deliveries USING GIN(payload);
