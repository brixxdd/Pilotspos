import { integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

/**
 * Contadores atómicos por organización (folios de venta, ventas suspendidas, etc.).
 * Se incrementan con INSERT ... ON CONFLICT DO UPDATE, que bloquea la fila en
 * conflicto y serializa incrementos concurrentes — evita folios duplicados
 * bajo carga concurrente de varias cajas.
 */
export const numberCounters = pgTable(
  "number_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    counterKey: text("counter_key").notNull(),
    nextValue: integer("next_value").notNull().default(1),
  },
  (table) => [uniqueIndex("number_counters_org_key_idx").on(table.organizationId, table.counterKey)],
);
