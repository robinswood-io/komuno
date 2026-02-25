ALTER TABLE "members" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "sector" text;--> statement-breakpoint
ALTER TABLE "patrons" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "patrons" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "patrons" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "patrons" ADD COLUMN "sector" text;--> statement-breakpoint
CREATE INDEX "members_department_idx" ON "members" USING btree ("department");--> statement-breakpoint
CREATE INDEX "members_city_idx" ON "members" USING btree ("city");--> statement-breakpoint
CREATE INDEX "members_postal_code_idx" ON "members" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "members_sector_idx" ON "members" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "patrons_department_idx" ON "patrons" USING btree ("department");--> statement-breakpoint
CREATE INDEX "patrons_city_idx" ON "patrons" USING btree ("city");--> statement-breakpoint
CREATE INDEX "patrons_postal_code_idx" ON "patrons" USING btree ("postal_code");--> statement-breakpoint
CREATE INDEX "patrons_sector_idx" ON "patrons" USING btree ("sector");
