import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { nextCounterValue } from "../../shared/counters.js";
import { NotFoundError } from "../../shared/errors.js";
import { fromQuantity } from "../../shared/numeric.js";
import type { CustomerContext } from "../../shared/customer-context.js";
import {
  calculateSubtotal,
  computePaymentSplit,
  isValidQuantity,
} from "@pilotspos/domain";
import type {
  MenuOrderCreateInput,
  MenuOrderUpdateInput,
} from "@pilotspos/validation";
import type { MenuOrder, MenuOrderItem, OrderStatus } from "@pilotspos/types";

function generateOrderNumber(sequence: number): string {
  return `P-${String(sequence).padStart(5, "0")}`;
}

/** Token opaco del QR de entrega: 24 bytes en base64url, no adivinable. */
function generateDeliveryToken(): string {
  return randomBytes(24).toString("base64url");
}

function toMenuOrder(
  row: typeof schema.menuOrders.$inferSelect,
  extras: {
    branchName?: string | null;
    resolvedByName?: string | null;
    driverName?: string | null;
    organizationName?: string | null;
  } = {},
): MenuOrder {
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationName: extras.organizationName ?? null,
    branchId: row.branchId,
    branchName: extras.branchName ?? null,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    addressLine: row.addressLine,
    addressReferences: row.addressReferences,
    items: (row.items as unknown as MenuOrderItem[]).map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal),
    })),
    paymentChoice: row.paymentChoice,
    requestedCredit: fromQuantity(row.requestedCredit),
    requestedCash: fromQuantity(row.requestedCash),
    estimatedTotal: fromQuantity(row.estimatedTotal),
    status: row.status,
    note: row.note,
    whatsappSentAt: row.whatsappSentAt ? row.whatsappSentAt.toISOString() : null,
    resolvedById: row.resolvedById,
    resolvedByName: extras.resolvedByName ?? null,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    deliveryToken: row.deliveryToken,
    driverId: row.driverId,
    driverName: extras.driverName ?? null,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    customerConfirmedAt: row.customerConfirmedAt ? row.customerConfirmedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Crea un pedido desde el menú digital. Ruta pública pero exige sesión de
 * cliente (`requireCustomer`): la carnicería necesita nombre y cómo llegar.
 *
 * Precios y stock se re-leen del catálogo — el cliente solo manda `productId`
 * y cantidad. El crédito pedido se recorta al disponible real del cliente y al
 * total del pedido, pero NO se reserva: se apunta, y el mostrador confirma el
 * monto al pesar la carne.
 */
export async function createMenuOrder(params: {
  orgSlug: string;
  branchSlug: string;
  customer: CustomerContext;
  input: MenuOrderCreateInput;
}) {
  const [organization] = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name, slug: schema.organizations.slug })
    .from(schema.organizations)
    .where(and(eq(schema.organizations.slug, params.orgSlug), eq(schema.organizations.active, true)))
    .limit(1);
  if (!organization) throw new NotFoundError("Negocio no encontrado");

  // La sesión de cliente pertenece a una organización; el pedido solo puede
  // crearse en esa misma organización, no en cualquier slug de la URL.
  if (organization.id !== params.customer.organizationId) {
    throw new NotFoundError("Negocio no encontrado");
  }

  const [branch] = await db
    .select({ id: schema.branches.id })
    .from(schema.branches)
    .where(
      and(
        eq(schema.branches.organizationId, organization.id),
        eq(schema.branches.slug, params.branchSlug),
        eq(schema.branches.active, true),
      ),
    )
    .limit(1);
  if (!branch) throw new NotFoundError("Sucursal no encontrada");

  const productIds = params.input.items.map((item) => item.productId);
  const productRows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      price: schema.products.price,
      unit: schema.products.unit,
    })
    .from(schema.products)
    .where(
      and(eq(schema.products.organizationId, organization.id), inArray(schema.products.id, productIds)),
    );

  const productById = new Map(productRows.map((p) => [p.id, p]));
  const missing = productIds.filter((id) => !productById.has(id));
  if (missing.length > 0) throw new NotFoundError("El catálogo cambió; revisa tu pedido");

  const items: MenuOrderItem[] = params.input.items.map((item) => {
    const product = productById.get(item.productId)!;
    if (!isValidQuantity(item.quantity, product.unit)) {
      throw new NotFoundError(`Cantidad inválida para ${product.name}`);
    }
    const unitPrice = fromQuantity(product.price);
    return {
      productId: product.id,
      name: product.name,
      unit: product.unit,
      unitPrice,
      quantity: item.quantity,
      subtotal: Math.round(unitPrice * item.quantity * 100) / 100,
    };
  });

  const estimatedTotal = calculateSubtotal(items);
  const availableCredit = Math.max(0, params.customer.creditLimit - params.customer.balance);
  const split = computePaymentSplit(
    estimatedTotal,
    params.input.paymentChoice,
    availableCredit,
    params.input.creditAmount,
  );

  const order = await db.transaction(async (tx) => {
    const sequence = await nextCounterValue(tx, organization.id, "menu_order");
    const [created] = await tx
      .insert(schema.menuOrders)
      .values({
        organizationId: organization.id,
        branchId: branch.id,
        orderNumber: generateOrderNumber(sequence),
        customerId: params.customer.customerId,
        customerName: `${params.customer.firstName} ${params.customer.lastName}`.trim(),
        customerPhone: params.customer.phone,
        addressLine: params.customer.addressLine,
        addressReferences: params.customer.addressReferences,
        items: items,
        paymentChoice: params.input.paymentChoice,
        requestedCredit: split.credit.toFixed(2),
        requestedCash: split.cash.toFixed(2),
        estimatedTotal: estimatedTotal.toFixed(2),
      })
      .returning();
    if (!created) throw new Error("No se pudo crear el pedido");
    return created;
  });

  return toMenuOrder(order);
}

export interface ListOrdersOptions {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

const ORDER_DEFAULT_PAGE_SIZE = 30;

/**
 * Pedidos del mostrador. El detalle de sucursal (nombre) se adjunta con un
 * join, y `resolvedByName` con el usuario que resolvió.
 */
export async function listOrders(
  organizationId: string,
  options: ListOrdersOptions = {},
) {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(options.pageSize ?? ORDER_DEFAULT_PAGE_SIZE, 100);

  const conditions = [eq(schema.menuOrders.organizationId, organizationId)];
  if (options.status) conditions.push(eq(schema.menuOrders.status, options.status));

  const whereClause = and(...conditions);

  const countRows = await db
    .select({ count: schema.menuOrders.id })
    .from(schema.menuOrders)
    .where(whereClause);
  const count = countRows.length;

  const rows = await db
    .select({
      order: schema.menuOrders,
      branchName: schema.branches.name,
      resolvedByName: schema.users.fullName,
      driverName: schema.drivers.name,
      organizationName: schema.organizations.name,
    })
    .from(schema.menuOrders)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.menuOrders.branchId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.menuOrders.organizationId))
    .leftJoin(schema.users, eq(schema.users.id, schema.menuOrders.resolvedById))
    .leftJoin(schema.drivers, eq(schema.drivers.id, schema.menuOrders.driverId))
    .where(whereClause)
    .orderBy(desc(schema.menuOrders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items = rows.map(({ order, branchName, resolvedByName, driverName, organizationName }) =>
    toMenuOrder(order, { branchName, resolvedByName, driverName, organizationName }),
  );

  return { items, total: count, page, pageSize };
}

export async function getOrderById(organizationId: string, id: string) {
  const [row] = await db
    .select({
      order: schema.menuOrders,
      branchName: schema.branches.name,
      resolvedByName: schema.users.fullName,
      driverName: schema.drivers.name,
      organizationName: schema.organizations.name,
    })
    .from(schema.menuOrders)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.menuOrders.branchId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.menuOrders.organizationId))
    .leftJoin(schema.users, eq(schema.users.id, schema.menuOrders.resolvedById))
    .leftJoin(schema.drivers, eq(schema.drivers.id, schema.menuOrders.driverId))
    .where(and(eq(schema.menuOrders.id, id), eq(schema.menuOrders.organizationId, organizationId)))
    .limit(1);

  if (!row) throw new NotFoundError("Pedido no encontrado");
  return toMenuOrder(row.order, {
    branchName: row.branchName,
    resolvedByName: row.resolvedByName,
    driverName: row.driverName,
    organizationName: row.organizationName,
  });
}

/**
 * El mostrador confirma, cancela o cierra un pedido. Un pedido ya resuelto
 * (CONFIRMED/COMPLETED/CANCELLED) solo admite el cambio a COMPLETED desde
 * CONFIRMED — no se vuelve atrás a PENDING.
 */
export async function updateOrderStatus(
  params: { organizationId: string; id: string; userId: string },
  input: MenuOrderUpdateInput,
) {
  const [existing] = await db
    .select()
    .from(schema.menuOrders)
    .where(
      and(eq(schema.menuOrders.id, params.id), eq(schema.menuOrders.organizationId, params.organizationId)),
    )
    .limit(1);
  if (!existing) throw new NotFoundError("Pedido no encontrado");

  const nextStatus = input.status;
  if (nextStatus && existing.status !== "PENDING" && nextStatus !== "COMPLETED") {
    throw new NotFoundError("Este pedido ya fue resuelto");
  }

  const [updated] = await db
    .update(schema.menuOrders)
    .set({
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(input.note !== undefined ? { note: input.note || null } : {}),
      ...(nextStatus
        ? { resolvedById: params.userId, resolvedAt: new Date() }
        : {}),
      // Al confirmar el pedido nace el QR de entrega: el repartidor solo puede
      // confirmar la entrega de pedidos confirmados/completados, nunca de los
      // que siguen pendientes o cancelados.
      ...(nextStatus === "CONFIRMED" && !existing.deliveryToken
        ? { deliveryToken: generateDeliveryToken() }
        : {}),
    })
    .where(and(eq(schema.menuOrders.id, params.id), eq(schema.menuOrders.organizationId, params.organizationId)))
    .returning();

  if (!updated) throw new NotFoundError("Pedido no encontrado");
  return getOrderById(params.organizationId, updated.id);
}
