import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  calculateChange,
  calculateDiscount,
  calculateSubtotal,
  calculateTotal,
  validateCart,
} from "@pilotspos/domain";
import type { CartItem } from "@pilotspos/types";
import { db, schema } from "../../shared/db.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import { nextCounterValue } from "../../shared/counters.js";
import { getCurrentOpenSession } from "../cash/service.js";
import type { SaleInput, SuspendSaleInput } from "@pilotspos/validation";

const CENTS = 100;
const toCents = (value: number) => Math.round(value * CENTS);

async function loadCartItems(organizationId: string, items: { productId: string; quantity: number }[]) {
  const productIds = items.map((i) => i.productId);
  const products = await db
    .select()
    .from(schema.products)
    .where(and(inArray(schema.products.id, productIds), eq(schema.products.organizationId, organizationId)));

  const productMap = new Map(products.map((p) => [p.id, p]));

  const cartItems: CartItem[] = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product || !product.active) {
      throw new NotFoundError(`Producto ${item.productId} no encontrado`);
    }
    return {
      productId: product.id,
      barcode: null,
      name: product.name,
      unitPrice: Number(product.price),
      quantity: item.quantity,
      stock: product.stock,
    };
  });

  return { cartItems, productMap };
}

function generateSaleNumber(sequence: number): string {
  return `V-${String(sequence).padStart(5, "0")}`;
}

export async function createSale(
  params: { organizationId: string; userId: string },
  input: SaleInput,
  options: { allowNegativeStock?: boolean } = {},
) {
  if (input.clientSaleId) {
    const [existing] = await db
      .select({ id: schema.sales.id })
      .from(schema.sales)
      .where(
        and(
          eq(schema.sales.organizationId, params.organizationId),
          eq(schema.sales.clientSaleId, input.clientSaleId),
        ),
      )
      .limit(1);
    // Reintento de una venta que ya se sincronizó: se devuelve la venta
    // existente en vez de crear un duplicado (ver nextCounterValue / offline sync).
    if (existing) return getSaleById(params.organizationId, existing.id);
  }

  const session = await getCurrentOpenSession(params.organizationId, params.userId);

  const { cartItems } = await loadCartItems(params.organizationId, input.items);

  const validation = validateCart(cartItems, { allowNegativeStock: options.allowNegativeStock });
  if (!validation.valid) {
    throw new AppError(
      "El carrito contiene productos sin stock suficiente o con cantidad inválida",
      400,
      "INVALID_CART",
    );
  }

  const subtotal = calculateSubtotal(cartItems);
  const discount = calculateDiscount(subtotal, input.discount);
  const total = calculateTotal(subtotal, discount);

  const paymentsCents = input.payments.reduce((sum, p) => sum + toCents(p.amount), 0);
  if (paymentsCents !== toCents(total)) {
    throw new AppError("El total de los pagos no coincide con el total de la venta", 400, "PAYMENT_MISMATCH");
  }

  const paymentsToInsert = input.payments.map((payment) => {
    if (payment.method === "CASH") {
      const received = payment.receivedAmount ?? payment.amount;
      const change = calculateChange(payment.amount, received);
      if (change === null) {
        throw new AppError("El efectivo recibido es insuficiente", 400, "INSUFFICIENT_CASH");
      }
      return { ...payment, receivedAmount: received, changeAmount: change };
    }
    return { ...payment, receivedAmount: null, changeAmount: null };
  });

  const sale = await db.transaction(async (tx) => {
    const sequence = await nextCounterValue(tx, params.organizationId, "sale");

    const [createdSale] = await tx
      .insert(schema.sales)
      .values({
        organizationId: params.organizationId,
        branchId: session.branchId,
        registerId: session.registerId,
        cashSessionId: session.id,
        userId: params.userId,
        saleNumber: generateSaleNumber(sequence),
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        status: "COMPLETED",
        clientSaleId: input.clientSaleId ?? null,
      })
      .returning();
    if (!createdSale) throw new Error("No se pudo crear la venta");

    for (const item of cartItems) {
      const itemSubtotal = item.unitPrice * item.quantity;

      await tx.insert(schema.saleItems).values({
        saleId: createdSale.id,
        productId: item.productId,
        productName: item.name,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        subtotal: itemSubtotal.toFixed(2),
      });

      const stockCondition = options.allowNegativeStock
        ? eq(schema.products.id, item.productId)
        : and(eq(schema.products.id, item.productId), gte(schema.products.stock, item.quantity));

      const [updatedProduct] = await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} - ${item.quantity}`, updatedAt: new Date() })
        .where(stockCondition)
        .returning({ id: schema.products.id });
      if (!updatedProduct) {
        throw new AppError(`Stock insuficiente para ${item.name}`, 409, "OUT_OF_STOCK");
      }

      await tx.insert(schema.inventoryMovements).values({
        organizationId: params.organizationId,
        branchId: session.branchId,
        productId: item.productId,
        type: "SALE",
        quantity: item.quantity,
        userId: params.userId,
        reference: createdSale.saleNumber,
      });
    }

    for (const payment of paymentsToInsert) {
      await tx.insert(schema.payments).values({
        saleId: createdSale.id,
        method: payment.method,
        amount: payment.amount.toFixed(2),
        receivedAmount: payment.receivedAmount?.toFixed(2) ?? null,
        changeAmount: payment.changeAmount?.toFixed(2) ?? null,
      });

      if (payment.method === "CASH") {
        await tx.insert(schema.cashMovements).values({
          organizationId: params.organizationId,
          cashSessionId: session.id,
          type: "SALE",
          amount: payment.amount.toFixed(2),
          userId: params.userId,
        });
      }
    }

    return createdSale;
  });

  return getSaleById(params.organizationId, sale.id);
}

export async function getSaleById(organizationId: string, saleId: string) {
  const [sale] = await db
    .select({
      id: schema.sales.id,
      saleNumber: schema.sales.saleNumber,
      subtotal: schema.sales.subtotal,
      discount: schema.sales.discount,
      total: schema.sales.total,
      status: schema.sales.status,
      createdAt: schema.sales.createdAt,
      branchId: schema.sales.branchId,
      branchName: schema.branches.name,
      cashierName: schema.users.fullName,
      organizationName: schema.organizations.name,
    })
    .from(schema.sales)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.sales.branchId))
    .innerJoin(schema.users, eq(schema.users.id, schema.sales.userId))
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.sales.organizationId))
    .where(and(eq(schema.sales.id, saleId), eq(schema.sales.organizationId, organizationId)))
    .limit(1);
  if (!sale) throw new NotFoundError("Venta no encontrada");

  const items = await db.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId));
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.saleId, saleId));

  return { ...sale, items, payments };
}

export async function listSales(
  organizationId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(options.pageSize ?? 30, 100);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.sales)
    .where(eq(schema.sales.organizationId, organizationId));

  const items = await db
    .select({
      id: schema.sales.id,
      saleNumber: schema.sales.saleNumber,
      total: schema.sales.total,
      status: schema.sales.status,
      createdAt: schema.sales.createdAt,
      cashierName: schema.users.fullName,
    })
    .from(schema.sales)
    .innerJoin(schema.users, eq(schema.users.id, schema.sales.userId))
    .where(eq(schema.sales.organizationId, organizationId))
    .orderBy(desc(schema.sales.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items, total: countRows[0]?.count ?? 0, page, pageSize };
}

export async function cancelSale(params: { organizationId: string; userId: string }, saleId: string) {
  const [sale] = await db
    .select()
    .from(schema.sales)
    .where(and(eq(schema.sales.id, saleId), eq(schema.sales.organizationId, params.organizationId)))
    .limit(1);
  if (!sale) throw new NotFoundError("Venta no encontrada");
  if (sale.status !== "COMPLETED") {
    throw new AppError("Solo se pueden cancelar ventas completadas", 400, "INVALID_SALE_STATUS");
  }

  const items = await db.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId));
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.saleId, saleId));

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(schema.products.id, item.productId));

      await tx.insert(schema.inventoryMovements).values({
        organizationId: params.organizationId,
        branchId: sale.branchId,
        productId: item.productId,
        type: "RETURN",
        quantity: item.quantity,
        userId: params.userId,
        reference: sale.saleNumber,
        note: "Cancelación de venta",
      });
    }

    if (sale.cashSessionId) {
      for (const payment of payments) {
        if (payment.method === "CASH") {
          await tx.insert(schema.cashMovements).values({
            organizationId: params.organizationId,
            cashSessionId: sale.cashSessionId,
            type: "REFUND",
            amount: payment.amount,
            userId: params.userId,
            note: `Cancelación de venta ${sale.saleNumber}`,
          });
        }
      }
    }

    await tx
      .update(schema.sales)
      .set({ status: "CANCELED" })
      .where(eq(schema.sales.id, saleId));
  });

  return getSaleById(params.organizationId, saleId);
}

// ---------------------------------------------------------------------------
// Suspender / recuperar venta
// ---------------------------------------------------------------------------

export async function suspendSale(
  params: { organizationId: string; branchId: string; registerId: string; userId: string },
  input: SuspendSaleInput,
) {
  const { cartItems } = await loadCartItems(params.organizationId, input.items);

  const created = await db.transaction(async (tx) => {
    const sequence = await nextCounterValue(tx, params.organizationId, "suspended_sale");

    const [row] = await tx
      .insert(schema.suspendedSales)
      .values({
        organizationId: params.organizationId,
        branchId: params.branchId,
        registerId: params.registerId,
        userId: params.userId,
        saleNumber: `S-${String(sequence).padStart(5, "0")}`,
        items: cartItems,
        discount: input.discount.toFixed(2),
        note: input.note ?? null,
      })
      .returning();
    if (!row) throw new Error("No se pudo crear la venta suspendida");
    return row;
  });

  return created;
}

export async function listSuspendedSales(organizationId: string, branchId: string | null) {
  const conditions = [eq(schema.suspendedSales.organizationId, organizationId)];
  if (branchId) conditions.push(eq(schema.suspendedSales.branchId, branchId));

  return db
    .select()
    .from(schema.suspendedSales)
    .where(and(...conditions))
    .orderBy(desc(schema.suspendedSales.createdAt));
}

export async function recoverSuspendedSale(organizationId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.suspendedSales)
    .where(and(eq(schema.suspendedSales.id, id), eq(schema.suspendedSales.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new NotFoundError("Venta suspendida no encontrada");

  const productIds = (row.items as CartItem[]).map((i) => i.productId);
  const freshProducts = await db
    .select()
    .from(schema.products)
    .where(and(inArray(schema.products.id, productIds), eq(schema.products.organizationId, organizationId)));
  const freshMap = new Map(freshProducts.map((p) => [p.id, p]));

  const items: CartItem[] = (row.items as CartItem[]).map((item) => {
    const fresh = freshMap.get(item.productId);
    return {
      ...item,
      unitPrice: fresh ? Number(fresh.price) : item.unitPrice,
      stock: fresh ? fresh.stock : 0,
      name: fresh ? fresh.name : item.name,
    };
  });

  await db.delete(schema.suspendedSales).where(eq(schema.suspendedSales.id, id));

  return { items, discount: Number(row.discount), note: row.note };
}

export async function discardSuspendedSale(organizationId: string, id: string) {
  const [deleted] = await db
    .delete(schema.suspendedSales)
    .where(and(eq(schema.suspendedSales.id, id), eq(schema.suspendedSales.organizationId, organizationId)))
    .returning({ id: schema.suspendedSales.id });
  if (!deleted) throw new NotFoundError("Venta suspendida no encontrada");
  return { success: true };
}
