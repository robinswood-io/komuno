CREATE TABLE "admins" (
	"email" text PRIMARY KEY NOT NULL,
	"first_name" text DEFAULT 'Admin' NOT NULL,
	"last_name" text DEFAULT 'User' NOT NULL,
	"password" text,
	"added_by" text,
	"role" text DEFAULT 'ideas_reader' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branding_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"requested_by" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"github_issue_number" integer,
	"github_issue_url" text,
	"status" text DEFAULT 'open' NOT NULL,
	"github_status" text DEFAULT 'open' NOT NULL,
	"admin_comment" text,
	"last_status_change_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) DEFAULT 'ovh' NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer DEFAULT 465 NOT NULL,
	"secure" boolean DEFAULT true NOT NULL,
	"from_name" varchar(255),
	"from_email" varchar(255) NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inscriptions_event_id_email_unique" UNIQUE("event_id","email")
);
--> statement-breakpoint
CREATE TABLE "event_sponsorships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"patron_id" varchar NOT NULL,
	"level" text NOT NULL,
	"amount" integer NOT NULL,
	"benefits" text,
	"is_publicly_visible" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"logo_url" text,
	"website_url" text,
	"proposed_by_admin_email" text NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_sponsorships_event_id_patron_id_unique" UNIQUE("event_id","patron_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp NOT NULL,
	"location" text,
	"max_participants" integer,
	"hello_asso_link" text,
	"enable_external_redirect" boolean DEFAULT false NOT NULL,
	"external_redirect_url" text,
	"show_inscriptions_count" boolean DEFAULT true NOT NULL,
	"show_available_seats" boolean DEFAULT true NOT NULL,
	"allow_unsubscribe" boolean DEFAULT false NOT NULL,
	"red_unsubscribe_button" boolean DEFAULT false NOT NULL,
	"button_mode" text DEFAULT 'subscribe' NOT NULL,
	"custom_button_text" text,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "feature_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_config_feature_key_unique" UNIQUE("feature_key")
);
--> statement-breakpoint
CREATE TABLE "financial_budgets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" varchar NOT NULL,
	"period" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"quarter" integer,
	"amount_in_cents" integer NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"parent_id" varchar,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar NOT NULL,
	"description" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" text,
	"vendor" text,
	"budget_id" varchar,
	"receipt_url" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_forecasts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar NOT NULL,
	"period" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"quarter" integer,
	"forecasted_amount_in_cents" integer NOT NULL,
	"confidence" text DEFAULT 'medium' NOT NULL,
	"based_on" text DEFAULT 'historical' NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_patron_proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" varchar NOT NULL,
	"patron_id" varchar NOT NULL,
	"proposed_by_admin_email" text NOT NULL,
	"proposed_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"comments" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idea_patron_proposals_idea_id_patron_id_unique" UNIQUE("idea_id","patron_id")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"proposed_by" text NOT NULL,
	"proposed_by_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"deadline" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "loan_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"lender_name" text NOT NULL,
	"photo_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposed_by" text NOT NULL,
	"proposed_by_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "member_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_email" text NOT NULL,
	"activity_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar,
	"entity_title" text,
	"metadata" text,
	"score_impact" integer NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_relations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_email" text NOT NULL,
	"related_member_email" text NOT NULL,
	"relation_type" text NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_email" varchar(255) NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"subscription_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"payment_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_tag_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_email" text NOT NULL,
	"tag_id" varchar NOT NULL,
	"assigned_by" text,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "member_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_email" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"task_type" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"completed_by" text,
	"assigned_to" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company" text,
	"phone" text,
	"role" text,
	"cjd_role" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"proposed_by" text,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp NOT NULL,
	"last_activity_at" timestamp NOT NULL,
	"activity_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "patron_donations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patron_id" varchar NOT NULL,
	"donated_at" timestamp NOT NULL,
	"amount" integer NOT NULL,
	"occasion" text NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patron_updates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patron_id" varchar NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"date" date NOT NULL,
	"start_time" text,
	"duration" integer,
	"description" text NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patrons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text,
	"company" text,
	"phone" text,
	"email" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"referrer_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "patrons_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "tracking_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_email" text NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tracking_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"entity_email" text NOT NULL,
	"metric_type" text NOT NULL,
	"metric_value" integer,
	"metric_data" text,
	"description" text,
	"recorded_by" text,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unsubscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unsubscriptions_event_id_email_unique" UNIQUE("event_id","email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" varchar NOT NULL,
	"voter_name" text NOT NULL,
	"voter_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_idea_id_voter_email_unique" UNIQUE("idea_id","voter_email")
);
--> statement-breakpoint
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sponsorships" ADD CONSTRAINT "event_sponsorships_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_sponsorships" ADD CONSTRAINT "event_sponsorships_patron_id_patrons_id_fk" FOREIGN KEY ("patron_id") REFERENCES "public"."patrons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_budgets" ADD CONSTRAINT "financial_budgets_category_financial_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."financial_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_expenses" ADD CONSTRAINT "financial_expenses_category_financial_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."financial_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_expenses" ADD CONSTRAINT "financial_expenses_budget_id_financial_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."financial_budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_forecasts" ADD CONSTRAINT "financial_forecasts_category_financial_categories_id_fk" FOREIGN KEY ("category") REFERENCES "public"."financial_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_patron_proposals" ADD CONSTRAINT "idea_patron_proposals_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_patron_proposals" ADD CONSTRAINT "idea_patron_proposals_patron_id_patrons_id_fk" FOREIGN KEY ("patron_id") REFERENCES "public"."patrons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_activities" ADD CONSTRAINT "member_activities_member_email_members_email_fk" FOREIGN KEY ("member_email") REFERENCES "public"."members"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_relations" ADD CONSTRAINT "member_relations_member_email_members_email_fk" FOREIGN KEY ("member_email") REFERENCES "public"."members"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_relations" ADD CONSTRAINT "member_relations_related_member_email_members_email_fk" FOREIGN KEY ("related_member_email") REFERENCES "public"."members"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_member_email_members_email_fk" FOREIGN KEY ("member_email") REFERENCES "public"."members"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tag_assignments" ADD CONSTRAINT "member_tag_assignments_member_email_members_email_fk" FOREIGN KEY ("member_email") REFERENCES "public"."members"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tag_assignments" ADD CONSTRAINT "member_tag_assignments_tag_id_member_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."member_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tasks" ADD CONSTRAINT "member_tasks_member_email_members_email_fk" FOREIGN KEY ("member_email") REFERENCES "public"."members"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_email_admins_email_fk" FOREIGN KEY ("email") REFERENCES "public"."admins"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patron_donations" ADD CONSTRAINT "patron_donations_patron_id_patrons_id_fk" FOREIGN KEY ("patron_id") REFERENCES "public"."patrons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patron_updates" ADD CONSTRAINT "patron_updates_patron_id_patrons_id_fk" FOREIGN KEY ("patron_id") REFERENCES "public"."patrons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrons" ADD CONSTRAINT "patrons_referrer_id_members_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unsubscriptions" ADD CONSTRAINT "unsubscriptions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admins_role_idx" ON "admins" USING btree ("role");--> statement-breakpoint
CREATE INDEX "admins_status_idx" ON "admins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admins_active_idx" ON "admins" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "dev_requests_type_idx" ON "development_requests" USING btree ("type");--> statement-breakpoint
CREATE INDEX "dev_requests_status_idx" ON "development_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dev_requests_requested_by_idx" ON "development_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "dev_requests_github_issue_idx" ON "development_requests" USING btree ("github_issue_number");--> statement-breakpoint
CREATE INDEX "inscriptions_event_id_idx" ON "inscriptions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_sponsorships_event_id_idx" ON "event_sponsorships" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_sponsorships_patron_id_idx" ON "event_sponsorships" USING btree ("patron_id");--> statement-breakpoint
CREATE INDEX "event_sponsorships_status_idx" ON "event_sponsorships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_sponsorships_level_idx" ON "event_sponsorships" USING btree ("level");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "events_status_date_idx" ON "events" USING btree ("status","date");--> statement-breakpoint
CREATE INDEX "feature_config_key_idx" ON "feature_config" USING btree ("feature_key");--> statement-breakpoint
CREATE INDEX "financial_budgets_category_idx" ON "financial_budgets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "financial_budgets_period_idx" ON "financial_budgets" USING btree ("period");--> statement-breakpoint
CREATE INDEX "financial_budgets_year_idx" ON "financial_budgets" USING btree ("year");--> statement-breakpoint
CREATE INDEX "financial_budgets_period_year_idx" ON "financial_budgets" USING btree ("period","year");--> statement-breakpoint
CREATE INDEX "financial_categories_type_idx" ON "financial_categories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "financial_categories_parent_id_idx" ON "financial_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "financial_categories_name_idx" ON "financial_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "financial_expenses_category_idx" ON "financial_expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "financial_expenses_expense_date_idx" ON "financial_expenses" USING btree ("expense_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "financial_expenses_budget_id_idx" ON "financial_expenses" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "financial_expenses_created_by_idx" ON "financial_expenses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "financial_forecasts_category_idx" ON "financial_forecasts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "financial_forecasts_period_idx" ON "financial_forecasts" USING btree ("period");--> statement-breakpoint
CREATE INDEX "financial_forecasts_year_idx" ON "financial_forecasts" USING btree ("year");--> statement-breakpoint
CREATE INDEX "financial_forecasts_period_year_idx" ON "financial_forecasts" USING btree ("period","year");--> statement-breakpoint
CREATE INDEX "idea_patron_proposals_idea_id_idx" ON "idea_patron_proposals" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_patron_proposals_patron_id_idx" ON "idea_patron_proposals" USING btree ("patron_id");--> statement-breakpoint
CREATE INDEX "idea_patron_proposals_status_idx" ON "idea_patron_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ideas_status_idx" ON "ideas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ideas_email_idx" ON "ideas" USING btree ("proposed_by_email");--> statement-breakpoint
CREATE INDEX "ideas_featured_idx" ON "ideas" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "ideas_created_at_idx" ON "ideas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "loan_items_status_idx" ON "loan_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "loan_items_created_at_idx" ON "loan_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "loan_items_title_search_idx" ON "loan_items" USING btree ("title");--> statement-breakpoint
CREATE INDEX "loan_items_status_created_idx" ON "loan_items" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "member_activities_member_email_idx" ON "member_activities" USING btree ("member_email");--> statement-breakpoint
CREATE INDEX "member_activities_occurred_at_idx" ON "member_activities" USING btree ("occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "member_activities_activity_type_idx" ON "member_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "member_relations_member_relation_idx" ON "member_relations" USING btree ("member_email","related_member_email");--> statement-breakpoint
CREATE INDEX "member_relations_member_email_idx" ON "member_relations" USING btree ("member_email");--> statement-breakpoint
CREATE INDEX "member_relations_related_member_email_idx" ON "member_relations" USING btree ("related_member_email");--> statement-breakpoint
CREATE INDEX "member_relations_relation_type_idx" ON "member_relations" USING btree ("relation_type");--> statement-breakpoint
CREATE INDEX "member_subscriptions_member_email_idx" ON "member_subscriptions" USING btree ("member_email");--> statement-breakpoint
CREATE INDEX "member_subscriptions_start_date_idx" ON "member_subscriptions" USING btree ("start_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "member_subscriptions_status_idx" ON "member_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_tag_assignments_member_tag_idx" ON "member_tag_assignments" USING btree ("member_email","tag_id");--> statement-breakpoint
CREATE INDEX "member_tag_assignments_member_email_idx" ON "member_tag_assignments" USING btree ("member_email");--> statement-breakpoint
CREATE INDEX "member_tag_assignments_tag_id_idx" ON "member_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "member_tags_name_idx" ON "member_tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "member_tasks_member_email_idx" ON "member_tasks" USING btree ("member_email");--> statement-breakpoint
CREATE INDEX "member_tasks_status_idx" ON "member_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_tasks_due_date_idx" ON "member_tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "member_tasks_created_by_idx" ON "member_tasks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "members_email_idx" ON "members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "members_last_activity_at_idx" ON "members" USING btree ("last_activity_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "members_engagement_score_idx" ON "members" USING btree ("engagement_score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "members_status_idx" ON "members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "members_cjd_role_idx" ON "members" USING btree ("cjd_role");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "patron_donations_patron_id_idx" ON "patron_donations" USING btree ("patron_id");--> statement-breakpoint
CREATE INDEX "patron_donations_donated_at_idx" ON "patron_donations" USING btree ("donated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "patron_updates_patron_id_idx" ON "patron_updates" USING btree ("patron_id");--> statement-breakpoint
CREATE INDEX "patron_updates_type_idx" ON "patron_updates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "patron_updates_date_idx" ON "patron_updates" USING btree ("date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "patron_updates_created_at_idx" ON "patron_updates" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "patrons_email_idx" ON "patrons" USING btree ("email");--> statement-breakpoint
CREATE INDEX "patrons_created_by_idx" ON "patrons" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "patrons_created_at_idx" ON "patrons" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "patrons_referrer_id_idx" ON "patrons" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_email_idx" ON "push_subscriptions" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "tracking_alerts_entity_type_idx" ON "tracking_alerts" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "tracking_alerts_entity_id_idx" ON "tracking_alerts" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "tracking_alerts_entity_email_idx" ON "tracking_alerts" USING btree ("entity_email");--> statement-breakpoint
CREATE INDEX "tracking_alerts_alert_type_idx" ON "tracking_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "tracking_alerts_severity_idx" ON "tracking_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "tracking_alerts_is_read_idx" ON "tracking_alerts" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "tracking_alerts_is_resolved_idx" ON "tracking_alerts" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "tracking_alerts_created_at_idx" ON "tracking_alerts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "tracking_metrics_entity_type_idx" ON "tracking_metrics" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "tracking_metrics_entity_id_idx" ON "tracking_metrics" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "tracking_metrics_entity_email_idx" ON "tracking_metrics" USING btree ("entity_email");--> statement-breakpoint
CREATE INDEX "tracking_metrics_metric_type_idx" ON "tracking_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "tracking_metrics_recorded_at_idx" ON "tracking_metrics" USING btree ("recorded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "votes_idea_id_idx" ON "votes" USING btree ("idea_id");