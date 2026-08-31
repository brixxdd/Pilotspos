import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { fromQuantity } from "../../shared/numeric.js";
import type {
  DeliveryConfirmInput,
  DeliveryReceivedInput,
  DriverCreateInput,
  DriverUpdateInput,
} from "@pilotspos/validation";
import type { Driver } from "@pilotspos/types";

// ---------------------------------------------------------------------------
// Vista pública de la entrega (el repartidor abre el QR del ticket)
// ---------------------------------------------------------------------------

export interface PublicDelivery {
  orderNumber: string;
  branchName: string;
  customerName: string;
  customerPhone: string;
  addressLine: string | null;
  addressReferences: string | null;
  items: Array<{ name: string; unit: "UNIT" | "LB"; quantity: number }>;
  estimatedTotal: number;
  requestedCredit: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  driverName: string | null;
  deliveredAt: string | null;
  customerConfirmedAt: string | null;
}

/**
 * Información que el repartidor ve al escanear el QR. Sin folio interno ni
 * token repetido: basta el número de pedido, el cliente, qué lleva y si ya se
 * entregó. Los precios se omiten a propósito — al repartidor le toca entregar,
 * no cobrar a destiempo.
 */
export async function getPublicDelivery(token: string): Promise<PublicDelivery> {
  const [row] = await db
    .select({
      order: schema.menuOrders,
      branchName: schema.branches.name,
      driverName: schema.drivers.name,
    })
    .from(schema.menuOrders)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.menuOrders.branchId))
    .leftJoin(schema.drivers, eq(schema.drivers.id, schema.menuOrders.driverId))
    .where(eq(schema.menuOrders.deliveryToken, token))
    .limit(1);

  if (!row) throw new NotFoundError("Ese QR no corresponde a ningún pedido");

  const items = (row.order.items as unknown as Array<{
    name: string;
    unit: "UNIT" | "LB";
    quantity: number;
  }>).map((item) => ({
    name: item.name,
    unit: item.unit,
    quantity: Number(item.quantity),
  }));

  return {
    orderNumber: row.order.orderNumber,
    branchName: row.branchName,
    customerName: row.order.customerName,
    customerPhone: row.order.customerPhone,
    addressLine: row.order.addressLine,
    addressReferences: row.order.addressReferences,
    items,
    estimatedTotal: fromQuantity(row.order.estimatedTotal),
    requestedCredit: fromQuantity(row.order.requestedCredit),
    status: row.order.status,
    driverName: row.driverName,
    deliveredAt: row.order.deliveredAt ? row.order.deliveredAt.toISOString() : null,
    customerConfirmedAt: row.order.customerConfirmedAt
      ? row.order.customerConfirmedAt.toISOString()
      : null,
  };
}

/**
 * El repartidor confirma la entrega desde el QR. Requisitos duros:
 * - el pedido existe y está CONFIRMED o COMPLETED (los pendientes/cancelados no
 *   se pueden "entregar");
 * - el teléfono pertenece a un repartidor ACTIVO de esa organización — sin
 *   estar registrado no se puede confirmar a nombre de otro;
 * - idempotente: si el mismo repartidor ya confirmó, devuelve el mismo estado.
 */
export async function confirmDelivery(input: DeliveryConfirmInput) {
  const [row] = await db
    .select()
    .from(schema.menuOrders)
    .where(eq(schema.menuOrders.deliveryToken, input.token))
    .limit(1);

  if (!row) throw new NotFoundError("Ese QR no corresponde a ningún pedido");
  if (row.status !== "CONFIRMED" && row.status !== "COMPLETED") {
    throw new ConflictError("Este pedido todavía no está listo para entregarse");
  }

  const [driver] = await db
    .select()
    .from(schema.drivers)
    .where(
      and(
        eq(schema.drivers.organizationId, row.organizationId),
        eq(schema.drivers.phone, input.phone),
        eq(schema.drivers.active, true),
      ),
    )
    .limit(1);

  if (!driver) {
    throw new ConflictError("Tu número no está registrado como repartidor de este negocio");
  }

  if (row.driverId && row.deliveredAt) {
    if (row.driverId === driver.id) {
      return getPublicDelivery(input.token);
    }
    const [other] = await db
      .select({ name: schema.drivers.name })
      .from(schema.drivers)
      .where(eq(schema.drivers.id, row.driverId))
      .limit(1);
    throw new ConflictError(`Este pedido ya fue entregado por ${other?.name ?? "otro repartidor"}`);
  }

  await db
    .update(schema.menuOrders)
    .set({ driverId: driver.id, deliveredAt: new Date() })
    .where(eq(schema.menuOrders.id, row.id));

  return getPublicDelivery(input.token);
}

/**
 * El CLIENTE confirma que recibió su pedido. Segunda cara del anti-robo:
 * el repartidor dice que entregó, el cliente dice que recibió. Requisitos:
 * - el pedido ya fue marcado como entregado por el repartidor;
 * - el teléfono es EXACTAMENTE el del pedido (la persona que lo ordenó).
 * Idempotente: si ya confirmó, devuelve el mismo estado.
 */
export async function confirmReceived(input: DeliveryReceivedInput) {
  const [row] = await db
    .select()
    .from(schema.menuOrders)
    .where(eq(schema.menuOrders.deliveryToken, input.token))
    .limit(1);

  if (!row) throw new NotFoundError("Ese QR no corresponde a ningún pedido");
  if (!row.deliveredAt) {
    throw new ConflictError("El repartidor todavía no registra la entrega");
  }

  if (input.phone !== row.customerPhone) {
    throw new ConflictError("Este teléfono no coincide con el del pedido");
  }

  if (row.customerConfirmedAt) {
    return getPublicDelivery(input.token);
  }

  await db
    .update(schema.menuOrders)
    .set({ customerConfirmedAt: new Date() })
    .where(eq(schema.menuOrders.id, row.id));

  return getPublicDelivery(input.token);
}

// ---------------------------------------------------------------------------
// Gestión de repartidores (staff) — requirePermission("drivers.manage")
// ---------------------------------------------------------------------------

function toDriver(row: typeof schema.drivers.$inferSelect): Driver {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    phone: row.phone,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDrivers(organizationId: string): Promise<Driver[]> {
  const rows = await db
    .select()
    .from(schema.drivers)
    .where(eq(schema.drivers.organizationId, organizationId))
    .orderBy(asc(schema.drivers.name));
  return rows.map(toDriver);
}

export async function createDriver(organizationId: string, input: DriverCreateInput) {
  const [existing] = await db
    .select({ id: schema.drivers.id })
    .from(schema.drivers)
    .where(and(eq(schema.drivers.organizationId, organizationId), eq(schema.drivers.phone, input.phone)))
    .limit(1);
  if (existing) throw new ConflictError("Ya hay un repartidor con ese teléfono");

  const [created] = await db
    .insert(schema.drivers)
    .values({ organizationId, name: input.name, phone: input.phone })
    .returning();
  if (!created) throw new Error("No se pudo crear el repartidor");
  return toDriver(created);
}

export async function updateDriver(
  organizationId: string,
  id: string,
  input: DriverUpdateInput,
) {
  const [existing] = await db
    .select()
    .from(schema.drivers)
    .where(and(eq(schema.drivers.id, id), eq(schema.drivers.organizationId, organizationId)))
    .limit(1);
  if (!existing) throw new NotFoundError("Repartidor no encontrado");

  if (input.phone && input.phone !== existing.phone) {
    const [conflict] = await db
      .select({ id: schema.drivers.id })
      .from(schema.drivers)
      .where(
        and(
          eq(schema.drivers.organizationId, organizationId),
          eq(schema.drivers.phone, input.phone),
        ),
      )
      .limit(1);
    if (conflict) throw new ConflictError("Ya hay un repartidor con ese teléfono");
  }

  const [updated] = await db
    .update(schema.drivers)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.drivers.id, id), eq(schema.drivers.organizationId, organizationId)))
    .returning();

  if (!updated) throw new NotFoundError("Repartidor no encontrado");
  return toDriver(updated);
}
