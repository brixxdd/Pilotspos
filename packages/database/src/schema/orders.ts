import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { branches, organizations } from "./organizations.js";
import { customers } from "./customers.js";
import { users } from "./users.js";
import { drivers } from "./drivers.js";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);

export const orderPaymentChoiceEnum = pgEnum("order_payment_choice", ["CASH", "CREDIT", "MIXED"]);

/**
 * Pedido hecho desde el menú digital (PENDING) y su ciclo en el mostrador
 * (CONFIRMED → COMPLETED, o CANCELLED). Guarda snapshot de todo lo que cambia
 * con el tiempo: nombre/teléfono/dirección del cliente (sobreviven a una edición
 * o borrado de su cuenta) y los renglones con precio del momento en que pidió.
 *
 * El crédito pedido (`requested_credit`) queda APUNTADO, no reservado: el total
 * real se define al pesar la carne, y ahí el mostrador confirma el monto final.
 */
export const menuOrders = pgTable(
  "menu_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    /** Folio por organización, generado con number_counters (key "menu_order"). */
    orderNumber: text("order_number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    addressLine: text("address_line"),
    addressReferences: text("address_references"),
    /** Snapshot de los renglones: { productId, name, unit, unitPrice, quantity, subtotal }. */
    items: jsonb("items").notNull(),
    paymentChoice: orderPaymentChoiceEnum("payment_choice").notNull(),
    requestedCredit: numeric("requested_credit", { precision: 12, scale: 2 }).notNull().default("0"),
    requestedCash: numeric("requested_cash", { precision: 12, scale: 2 }).notNull().default("0"),
    estimatedTotal: numeric("estimated_total", { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    note: text("note"),
    whatsappSentAt: timestamp("whatsapp_sent_at", { withTimezone: true }),
    resolvedById: uuid("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /**
     * Token opaco que viaja en el QR del ticket: el repartidor lo escanea para
     * confirmar la entrega. Se genera al confirmar el pedido (PENDING no lo
     * tiene). Solo lo conoce el mostrador que imprime el ticket y quien recibe
     * la mercancía — nadie puede confirmar una entrega sin el QR en mano.
     */
    deliveryToken: text("delivery_token"),
    /** Repartidor que confirmó la entrega (debe ser activo en la organización). */
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    /**
     * Confirmación del CLIENTE al recibir. Doble cara del anti-robo: el
     * repartidor confirma que entregó y el cliente confirma que recibió.
     * Sin esto (entregado sin recibido) el mostrador puede hacer seguimiento.
     */
    customerConfirmedAt: timestamp("customer_confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("menu_orders_organization_id_idx").on(table.organizationId),
    index("menu_orders_branch_id_idx").on(table.branchId),
    index("menu_orders_status_idx").on(table.status),
    index("menu_orders_created_at_idx").on(table.createdAt),
    index("menu_orders_customer_id_idx").on(table.customerId),
    uniqueIndex("menu_orders_org_number_idx").on(table.organizationId, table.orderNumber),
    uniqueIndex("menu_orders_org_delivery_token_idx").on(table.organizationId, table.deliveryToken),
  ],
);
