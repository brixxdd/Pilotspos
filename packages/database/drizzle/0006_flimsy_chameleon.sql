CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_orders" ADD COLUMN "delivery_token" text;--> statement-breakpoint
ALTER TABLE "menu_orders" ADD COLUMN "driver_id" uuid;--> statement-breakpoint
ALTER TABLE "menu_orders" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drivers_organization_id_idx" ON "drivers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_org_phone_idx" ON "drivers" USING btree ("organization_id","phone");--> statement-breakpoint
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_orders_org_delivery_token_idx" ON "menu_orders" USING btree ("organization_id","delivery_token");