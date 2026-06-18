CREATE TABLE IF NOT EXISTS "member_groups" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type" text DEFAULT 'other' NOT NULL,
  "year" integer NOT NULL,
  "description" text,
  "color" text DEFAULT '#3b82f6' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "member_groups_name_year_unique" UNIQUE("name", "year")
);

CREATE TABLE IF NOT EXISTS "member_group_memberships" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" varchar NOT NULL,
  "member_email" text NOT NULL,
  "role" text,
  "mission" text,
  "start_date" date,
  "end_date" date,
  "notes" text,
  "assigned_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "member_group_memberships_group_member_unique" UNIQUE("group_id", "member_email")
);

DO $$ BEGIN
 ALTER TABLE "member_group_memberships" ADD CONSTRAINT "member_group_memberships_group_id_member_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."member_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "member_group_memberships" ADD CONSTRAINT "member_group_memberships_member_email_members_email_fk" FOREIGN KEY ("member_email") REFERENCES "public"."members"("email") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "member_groups_year_idx" ON "member_groups" USING btree ("year");
CREATE INDEX IF NOT EXISTS "member_groups_type_idx" ON "member_groups" USING btree ("type");
CREATE INDEX IF NOT EXISTS "member_groups_active_idx" ON "member_groups" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "member_group_memberships_group_id_idx" ON "member_group_memberships" USING btree ("group_id");
CREATE INDEX IF NOT EXISTS "member_group_memberships_member_email_idx" ON "member_group_memberships" USING btree ("member_email");
