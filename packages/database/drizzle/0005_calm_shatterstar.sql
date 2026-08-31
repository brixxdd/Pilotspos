CREATE TYPE "public"."order_payment_choice" AS ENUM('CASH', 'CREDIT', 'MIXED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "menu_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"address_line" text,
	"address_references" text,
	"items" jsonb NOT NULL,
	"payment_choice" "order_payment_choice" NOT NULL,
	"requested_credit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"requested_cash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"estimated_total" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"whatsapp_sent_at" timestamp with time zone,
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "menu_order_id" uuid;--> statement-breakpoint
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_orders" ADD CONSTRAINT "menu_orders_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_orders_organization_id_idx" ON "menu_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "menu_orders_branch_id_idx" ON "menu_orders" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "menu_orders_status_idx" ON "menu_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "menu_orders_created_at_idx" ON "menu_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "menu_orders_customer_id_idx" ON "menu_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_orders_org_number_idx" ON "menu_orders" USING btree ("organization_id","order_number");--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_menu_order_id_menu_orders_id_fk" FOREIGN KEY ("menu_order_id") REFERENCES "public"."menu_orders"("id") ON DELETE set null ON UPDATE no action;