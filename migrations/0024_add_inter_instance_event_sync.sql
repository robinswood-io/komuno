-- Inter-instance federation sync.
-- Adds relation-level shared tokens plus remote sync state on event syndications.

ALTER TABLE "organization_relations" ADD COLUMN IF NOT EXISTS "federation_token" text;
ALTER TABLE "organization_relations" ADD COLUMN IF NOT EXISTS "sync_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "organization_relations" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp;
ALTER TABLE "organization_relations" ADD COLUMN IF NOT EXISTS "sync_status" text DEFAULT 'idle' NOT NULL;

ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "target_instance_url" text;
ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "remote_event_id" varchar;
ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "remote_syndication_id" varchar;
ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "sync_status" text DEFAULT 'local' NOT NULL;
ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "sync_error" text;
ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "last_sync_attempt_at" timestamp;
ALTER TABLE "event_syndications" ADD COLUMN IF NOT EXISTS "sync_attempts" integer DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS "organization_relations_sync_status_idx" ON "organization_relations" USING btree ("sync_status");
CREATE INDEX IF NOT EXISTS "organization_relations_sync_enabled_idx" ON "organization_relations" USING btree ("sync_enabled");
CREATE INDEX IF NOT EXISTS "event_syndications_sync_status_idx" ON "event_syndications" USING btree ("sync_status");
CREATE INDEX IF NOT EXISTS "event_syndications_remote_event_idx" ON "event_syndications" USING btree ("remote_event_id");
CREATE INDEX IF NOT EXISTS "event_syndications_remote_syndication_idx" ON "event_syndications" USING btree ("remote_syndication_id");

-- One federated copy per source instance + source event. Partial index keeps local events unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "events_source_instance_event_unique_idx"
  ON "events" ("source_instance_url", "source_event_id")
  WHERE "source_instance_url" IS NOT NULL AND "source_event_id" IS NOT NULL;
