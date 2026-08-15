ALTER TABLE "sales" ADD COLUMN "client_sale_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_org_client_sale_id_idx" ON "sales" USING btree ("organization_id","client_sale_id");