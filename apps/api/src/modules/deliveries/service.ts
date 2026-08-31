import { and, asc, desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "../../shared/db.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../shared/errors.js";
import { fromQuantity } from "../../shared/numeric.js";
import type {
  DeliveryConfirmInput,
  DeliveryReceivedInput,
  DriverCreateInput,
  DriverLoginInput,
  DriverUpdateInput,
} from "@pilotspos/validation";
import type { Driver, DriverDeliveryRecord, SessionDriver } from "@pilotspos/types";
import { createDriverSession, purgeExpiredDriverSessions } from "./session.service.js";

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

  const pinHash = await bcrypt.hash(input.pin, 10);

  const [created] = await db
    .insert(schema.drivers)
    .values({ organizationId, name: input.name, phone: input.phone, pinHash })
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
      ...(input.pin !== undefined ? { pinHash: await bcrypt.hash(input.pin, 10) } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.drivers.id, id), eq(schema.drivers.organizationId, organizationId)))
    .returning();

  if (!updated) throw new NotFoundError("Repartidor no encontrado");
  return toDriver(updated);
}

// ---------------------------------------------------------------------------
// Portal del repartidor (/r)
// ---------------------------------------------------------------------------

/**
 * Login del repartidor: teléfono + PIN. Mismo mensaje si el teléfono no existe
 * o el PIN no coincide, para no revelar qué teléfonos son repartidores.
 */
export async function loginDriver(input: DriverLoginInput) {
  const genericError = () => new UnauthorizedError("Teléfono o PIN incorrectos");

  const [driver] = await db
    .select({
      id: schema.drivers.id,
      name: schema.drivers.name,
      phone: schema.drivers.phone,
      pinHash: schema.drivers.pinHash,
      active: schema.drivers.active,
      organizationId: schema.drivers.organizationId,
      organizationName: schema.organizations.name,
    })
    .from(schema.drivers)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.drivers.organizationId))
    .where(and(eq(schema.drivers.phone, input.phone), eq(schema.drivers.active, true)))
    .limit(1);

  if (!driver || !driver.pinHash) throw genericError();
  const pinMatches = await bcrypt.compare(input.pin, driver.pinHash);
  if (!pinMatches) throw genericError();

  await purgeExpiredDriverSessions();

  const { token, expiresAt } = await createDriverSession({
    driverId: driver.id,
    organizationId: driver.organizationId,
  });

  return {
    token,
    expiresAt,
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      organizationId: driver.organizationId,
      organizationName: driver.organizationName,
    } satisfies SessionDriver,
  };
}

/**
 * Historial de entregas del repartidor en su portal. Solo las que él registró
 * (driver_id = él); el mostrador ve el mismo detalle en /orders.
 */
export async function listDriverDeliveries(
  organizationId: string,
  driverId: string,
): Promise<DriverDeliveryRecord[]> {
  const rows = await db
    .select({
      id: schema.menuOrders.id,
      orderNumber: schema.menuOrders.orderNumber,
      branchName: schema.branches.name,
      customerName: schema.menuOrders.customerName,
      customerPhone: schema.menuOrders.customerPhone,
      addressLine: schema.menuOrders.addressLine,
      estimatedTotal: schema.menuOrders.estimatedTotal,
      status: schema.menuOrders.status,
      deliveredAt: schema.menuOrders.deliveredAt,
      customerConfirmedAt: schema.menuOrders.customerConfirmedAt,
      createdAt: schema.menuOrders.createdAt,
    })
    .from(schema.menuOrders)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.menuOrders.branchId))
    .where(
      and(
        eq(schema.menuOrders.organizationId, organizationId),
        eq(schema.menuOrders.driverId, driverId),
      ),
    )
    .orderBy(desc(schema.menuOrders.createdAt))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    branchName: row.branchName,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    addressLine: row.addressLine,
    estimatedTotal: fromQuantity(row.estimatedTotal),
    status: row.status,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    customerConfirmedAt: row.customerConfirmedAt ? row.customerConfirmedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}
