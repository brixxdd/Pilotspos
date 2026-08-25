-- Venta por libra para carnicería.
--
-- Guatemala vende carne por libra y la báscula del mostrador marca decimales
-- (3.250 lb). Las cantidades eran `integer`, lo que hacía imposible registrar
-- media libra. Se pasan a numeric(12,3) y se agrega la unidad de venta.

CREATE TYPE "product_unit" AS ENUM('UNIT', 'LB');
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" "product_unit" DEFAULT 'UNIT' NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "stock" SET DATA TYPE numeric(12, 3) USING "stock"::numeric(12, 3);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "stock" SET DEFAULT '0';
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "minimum_stock" SET DATA TYPE numeric(12, 3) USING "minimum_stock"::numeric(12, 3);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "minimum_stock" SET DEFAULT '0';
--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(12, 3) USING "quantity"::numeric(12, 3);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "quantity" SET DATA TYPE numeric(12, 3) USING "quantity"::numeric(12, 3);
