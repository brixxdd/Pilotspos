import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

/**
 * Repartidores del negocio: la gente que lleva los pedidos a domicilio.
 *
 * El QR que se imprime en el ticket de un pedido confirmado lo escanea el
 * repartidor; para confirmar la entrega tiene que existir como repartidor
 * ACTIVO de esa organización. Así la entrega queda asociada a su teléfono y
 * a su nombre — si alguien no está registrado, no puede confirmar a nombre
 * de otro, y queda rastro de quién entregó qué y cuándo.
 */
export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("drivers_organization_id_idx").on(table.organizationId),
    uniqueIndex("drivers_org_phone_idx").on(table.organizationId, table.phone),
  ],
);
