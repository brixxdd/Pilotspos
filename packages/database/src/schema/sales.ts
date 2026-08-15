import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { branches, organizations, registers } from "./organizations.js";
import { cashSessions } from "./cash.js";
import { products } from "./products.js";
import { users } from "./users.js";

export const saleStatusEnum = pgEnum("sale_status", ["COMPLETED", "CANCELED", "SUSPENDED"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CASH", "CARD", "TRANSFER", "MIXED"]);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    registerId: uuid("register_id")
      .notNull()
      .references(() => registers.id, { onDelete: "cascade" }),
    cashSessionId: uuid("cash_session_id").references(() => cashSessions.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    saleNumber: text("sale_number").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    status: saleStatusEnum("status").notNull().default("COMPLETED"),
    /**
     * UUID generado por el cliente para ventas que se cerraron sin conexión.
     * Permite reintentar la sincronización sin duplicar la venta si la
     * respuesta del primer intento se perdió (ver apps/api/.../sales/service.ts).
     */
    clientSaleId: uuid("client_sale_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sales_organization_id_idx").on(table.organizationId),
    index("sales_branch_id_idx").on(table.branchId),
    index("sales_created_at_idx").on(table.createdAt),
    uniqueIndex("sales_org_sale_number_idx").on(table.organizationId, table.saleNumber),
    uniqueIndex("sales_org_client_sale_id_idx").on(table.organizationId, table.clientSaleId),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => [index("sale_items_sale_id_idx").on(table.saleId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    receivedAmount: numeric("received_amount", { precision: 12, scale: 2 }),
    changeAmount: numeric("change_amount", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payments_sale_id_idx").on(table.saleId)],
);

export const suspendedSales = pgTable(
  "suspended_sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    registerId: uuid("register_id")
      .notNull()
      .references(() => registers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    saleNumber: text("sale_number").notNull(),
    items: jsonb("items").notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("suspended_sales_organization_id_idx").on(table.organizationId),
    index("suspended_sales_branch_id_idx").on(table.branchId),
  ],
);
