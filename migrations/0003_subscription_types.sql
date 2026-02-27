CREATE TABLE "financial_revenues" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"revenue_date" date NOT NULL,
	"member_email" text,
	"patron_id" varchar,
	"payment_method" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"receipt_url" text,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"amount_in_cents" integer NOT NULL,
	"duration_type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD COLUMN "subscription_type_id" uuid;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD COLUMN "assigned_by" varchar(255);--> statement-breakpoint
CREATE INDEX "financial_revenues_type_idx" ON "financial_revenues" USING btree ("type");--> statement-breakpoint
CREATE INDEX "financial_revenues_revenue_date_idx" ON "financial_revenues" USING btree ("revenue_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "financial_revenues_member_email_idx" ON "financial_revenues" USING btree ("member_email");--> statement-breakpoint
CREATE INDEX "financial_revenues_patron_id_idx" ON "financial_revenues" USING btree ("patron_id");--> statement-breakpoint
CREATE INDEX "financial_revenues_status_idx" ON "financial_revenues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_revenues_created_by_idx" ON "financial_revenues" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "subscription_types_name_idx" ON "subscription_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "subscription_types_duration_type_idx" ON "subscription_types" USING btree ("duration_type");--> statement-breakpoint
CREATE INDEX "subscription_types_is_active_idx" ON "subscription_types" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_subscription_type_id_subscription_types_id_fk" FOREIGN KEY ("subscription_type_id") REFERENCES "public"."subscription_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_subscriptions_subscription_type_id_idx" ON "member_subscriptions" USING btree ("subscription_type_id");