-- Federation / regional module foundation
-- Adds explicit organization networks, parent/child relationships and event syndication.

CREATE TABLE IF NOT EXISTS "organization_networks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "network_id" varchar,
  "parent_organization_id" varchar,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "type" text DEFAULT 'section' NOT NULL,
  "domain" text,
  "instance_url" text,
  "branding_config_id" integer,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "organization_relations" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "from_organization_id" varchar NOT NULL,
  "to_organization_id" varchar NOT NULL,
  "relation_type" text DEFAULT 'region_section' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "organization_relations_unique" UNIQUE("from_organization_id", "to_organization_id", "relation_type")
);

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "organization_id" varchar;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "origin_organization_id" varchar;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source_event_id" varchar;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "source_instance_url" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "federation_visibility" text DEFAULT 'local' NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "federation_status" text DEFAULT 'local_only' NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "is_federated_copy" boolean DEFAULT false NOT NULL;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "canonical_event_id" varchar;

CREATE TABLE IF NOT EXISTS "event_syndications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" varchar NOT NULL,
  "source_organization_id" varchar NOT NULL,
  "target_organization_id" varchar NOT NULL,
  "direction" text NOT NULL,
  "status" text DEFAULT 'proposed' NOT NULL,
  "include_in_agenda" boolean DEFAULT false NOT NULL,
  "local_title_override" text,
  "local_description_override" text,
  "local_date_override" timestamp,
  "local_registration_url_override" text,
  "last_synced_at" timestamp,
  "created_by" text,
  "reviewed_by" text,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "event_syndications_unique" UNIQUE("event_id", "source_organization_id", "target_organization_id")
);

DO $$ BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_network_id_fk" FOREIGN KEY ("network_id") REFERENCES "public"."organization_networks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_organization_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "organization_relations" ADD CONSTRAINT "organization_relations_from_organization_id_fk" FOREIGN KEY ("from_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "organization_relations" ADD CONSTRAINT "organization_relations_to_organization_id_fk" FOREIGN KEY ("to_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_origin_organization_id_fk" FOREIGN KEY ("origin_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "event_syndications" ADD CONSTRAINT "event_syndications_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "event_syndications" ADD CONSTRAINT "event_syndications_source_organization_id_fk" FOREIGN KEY ("source_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "event_syndications" ADD CONSTRAINT "event_syndications_target_organization_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "organization_networks_slug_idx" ON "organization_networks" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "organization_networks_active_idx" ON "organization_networks" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "organizations_network_idx" ON "organizations" USING btree ("network_id");
CREATE INDEX IF NOT EXISTS "organizations_parent_idx" ON "organizations" USING btree ("parent_organization_id");
CREATE INDEX IF NOT EXISTS "organizations_type_idx" ON "organizations" USING btree ("type");
CREATE INDEX IF NOT EXISTS "organizations_domain_idx" ON "organizations" USING btree ("domain");
CREATE INDEX IF NOT EXISTS "organizations_active_idx" ON "organizations" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "organization_relations_from_idx" ON "organization_relations" USING btree ("from_organization_id");
CREATE INDEX IF NOT EXISTS "organization_relations_to_idx" ON "organization_relations" USING btree ("to_organization_id");
CREATE INDEX IF NOT EXISTS "organization_relations_type_idx" ON "organization_relations" USING btree ("relation_type");
CREATE INDEX IF NOT EXISTS "organization_relations_status_idx" ON "organization_relations" USING btree ("status");
CREATE INDEX IF NOT EXISTS "events_organization_idx" ON "events" USING btree ("organization_id");
CREATE INDEX IF NOT EXISTS "events_origin_organization_idx" ON "events" USING btree ("origin_organization_id");
CREATE INDEX IF NOT EXISTS "events_federation_visibility_idx" ON "events" USING btree ("federation_visibility");
CREATE INDEX IF NOT EXISTS "events_federation_status_idx" ON "events" USING btree ("federation_status");
CREATE INDEX IF NOT EXISTS "event_syndications_event_idx" ON "event_syndications" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "event_syndications_source_idx" ON "event_syndications" USING btree ("source_organization_id");
CREATE INDEX IF NOT EXISTS "event_syndications_target_idx" ON "event_syndications" USING btree ("target_organization_id");
CREATE INDEX IF NOT EXISTS "event_syndications_direction_idx" ON "event_syndications" USING btree ("direction");
CREATE INDEX IF NOT EXISTS "event_syndications_status_idx" ON "event_syndications" USING btree ("status");
CREATE INDEX IF NOT EXISTS "event_syndications_agenda_idx" ON "event_syndications" USING btree ("include_in_agenda");

-- Safe baseline: current historical CJD80 instance is a section in the CJD network.
INSERT INTO "organization_networks" ("slug", "name", "description")
VALUES ('cjd', 'CJD', 'Réseau fédéré CJD')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "organizations" ("network_id", "slug", "name", "type", "domain", "instance_url")
SELECT n."id", 'cjd-amiens', 'CJD Amiens', 'section', 'cjd80.fr', 'https://cjd80.fr'
FROM "organization_networks" n
WHERE n."slug" = 'cjd'
ON CONFLICT ("slug") DO UPDATE SET
  "network_id" = EXCLUDED."network_id",
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "domain" = EXCLUDED."domain",
  "instance_url" = EXCLUDED."instance_url",
  "updated_at" = now();

UPDATE "events"
SET "organization_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'cjd-amiens' LIMIT 1)
WHERE "organization_id" IS NULL;
