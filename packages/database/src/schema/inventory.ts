import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { branches, organizations } from "./organizations.js";
import { products } from "./products.js";
import { users } from "./users.js";

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "SALE",
  "PURCHASE",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "RETURN",
  "INITIAL_STOCK",
]);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reference: text("reference"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_movements_organization_id_idx").on(table.organizationId),
    index("inventory_movements_branch_id_idx").on(table.branchId),
    index("inventory_movements_product_id_idx").on(table.productId),
    index("inventory_movements_created_at_idx").on(table.createdAt),
  ],
);
