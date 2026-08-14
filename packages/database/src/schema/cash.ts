import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { branches, organizations, registers } from "./organizations.js";
import { users } from "./users.js";

export const cashSessionStatusEnum = pgEnum("cash_session_status", ["OPEN", "CLOSED"]);

export const cashMovementTypeEnum = pgEnum("cash_movement_type", [
  "OPENING",
  "SALE",
  "WITHDRAWAL",
  "DEPOSIT",
  "REFUND",
  "ADJUSTMENT",
]);

export const cashSessions = pgTable(
  "cash_sessions",
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
    openingAmount: numeric("opening_amount", { precision: 12, scale: 2 }).notNull(),
    closingAmount: numeric("closing_amount", { precision: 12, scale: 2 }),
    expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }),
    countedCash: numeric("counted_cash", { precision: 12, scale: 2 }),
    difference: numeric("difference", { precision: 12, scale: 2 }),
    status: cashSessionStatusEnum("status").notNull().default("OPEN"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("cash_sessions_organization_id_idx").on(table.organizationId),
    index("cash_sessions_register_id_idx").on(table.registerId),
    index("cash_sessions_status_idx").on(table.status),
  ],
);

export const cashMovements = pgTable(
  "cash_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    cashSessionId: uuid("cash_session_id")
      .notNull()
      .references(() => cashSessions.id, { onDelete: "cascade" }),
    type: cashMovementTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cash_movements_organization_id_idx").on(table.organizationId),
    index("cash_movements_cash_session_id_idx").on(table.cashSessionId),
    index("cash_movements_created_at_idx").on(table.createdAt),
  ],
);
