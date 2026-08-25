import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

/**
 * Clientes finales del negocio: los que piden desde el menú digital y los que
 * compran al fiado en el mostrador. NO son usuarios del sistema — un cliente
 * nunca tiene rol ni entra a la aplicación interna. Por eso viven en su propia
 * tabla y con su propia tabla de sesiones (`customerSessions`), separadas de
 * `users`/`sessions`: así ninguna consulta puede confundir a un cliente con
 * personal de la carnicería.
 */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    // El teléfono es la identidad del cliente: es lo que la carnicería ya
    // conoce de él y con lo que lo busca en la libreta de fiado.
    phone: text("phone").notNull(),
    addressLine: text("address_line"),
    /** Cómo llegar: "portón verde frente a la tienda de doña Mari". */
    addressReferences: text("address_references"),
    passwordHash: text("password_hash").notNull(),
    /** Techo del fiado. En 0 el cliente existe pero solo puede pagar de contado. */
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
    /** Lo que debe hoy. Positivo = debe. Lo mueve el mostrador, nunca el cliente. */
    balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customers_organization_id_idx").on(table.organizationId),
    uniqueIndex("customers_org_phone_idx").on(table.organizationId, table.phone),
    index("customers_last_name_idx").on(table.lastName),
  ],
);

/**
 * Sesiones de cliente. Misma mecánica que `sessions` (la cookie lleva un token
 * opaco, la base guarda solo su hash) pero en su propia tabla y con su propia
 * cookie, para que una sesión de cliente jamás pueda resolverse a un
 * `AuthContext` de personal.
 */
export const customerSessions = pgTable(
  "customer_sessions",
  {
    id: text("id").primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_sessions_customer_id_idx").on(table.customerId),
    index("customer_sessions_expires_at_idx").on(table.expiresAt),
  ],
);
