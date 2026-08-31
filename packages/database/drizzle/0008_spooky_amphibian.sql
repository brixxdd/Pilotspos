CREATE TABLE "driver_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"driver_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "driver_sessions" ADD CONSTRAINT "driver_sessions_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_sessions" ADD CONSTRAINT "driver_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_sessions_driver_id_idx" ON "driver_sessions" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "driver_sessions_expires_at_idx" ON "driver_sessions" USING btree ("expires_at");