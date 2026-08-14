import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { AppError, NotFoundError } from "../../shared/errors.js";
import type { InventoryAdjustInput, InventoryReceiveInput } from "@pilotspos/validation";

export async function getInventoryOverview(
  organizationId: string,
  options: { search?: string; onlyLowStock?: boolean } = {},
) {
  const conditions = [eq(schema.products.organizationId, organizationId), eq(schema.products.active, true)];
  if (options.search) {
    conditions.push(sql`${schema.products.name} ILIKE ${`%${options.search}%`}`);
  }
  if (options.onlyLowStock) {
    conditions.push(lte(schema.products.stock, schema.products.minimumStock));
  }

  return db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      sku: schema.products.sku,
      stock: schema.products.stock,
      minimumStock: schema.products.minimumStock,
      categoryName: schema.categories.name,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
    .where(and(...conditions))
    .orderBy(asc(schema.products.name));
}

export async function listMovements(
  organizationId: string,
  options: { productId?: string; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(options.pageSize ?? 30, 100);

  const conditions = [eq(schema.inventoryMovements.organizationId, organizationId)];
  if (options.productId) conditions.push(eq(schema.inventoryMovements.productId, options.productId));
  const whereClause = and(...conditions);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.inventoryMovements)
    .where(whereClause);

  const items = await db
    .select({
      id: schema.inventoryMovements.id,
      productId: schema.inventoryMovements.productId,
      productName: schema.products.name,
      type: schema.inventoryMovements.type,
      quantity: schema.inventoryMovements.quantity,
      reference: schema.inventoryMovements.reference,
      note: schema.inventoryMovements.note,
      createdAt: schema.inventoryMovements.createdAt,
      userName: schema.users.fullName,
    })
    .from(schema.inventoryMovements)
    .innerJoin(schema.products, eq(schema.products.id, schema.inventoryMovements.productId))
    .innerJoin(schema.users, eq(schema.users.id, schema.inventoryMovements.userId))
    .where(whereClause)
    .orderBy(desc(schema.inventoryMovements.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items, total: countRows[0]?.count ?? 0, page, pageSize };
}

export async function receiveInventory(
  params: { organizationId: string; branchId: string; userId: string },
  input: InventoryReceiveInput,
) {
  await db.transaction(async (tx) => {
    for (const item of input.items) {
      const [product] = await tx
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(and(eq(schema.products.id, item.productId), eq(schema.products.organizationId, params.organizationId)))
        .limit(1);
      if (!product) throw new NotFoundError(`Producto ${item.productId} no encontrado`);

      await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} + ${item.quantity}`, updatedAt: new Date() })
        .where(eq(schema.products.id, item.productId));

      await tx.insert(schema.inventoryMovements).values({
        organizationId: params.organizationId,
        branchId: params.branchId,
        productId: item.productId,
        type: "PURCHASE",
        quantity: item.quantity,
        userId: params.userId,
        reference: input.reference ?? null,
        note: input.note ?? null,
      });
    }
  });

  return { success: true };
}

export async function adjustInventory(
  params: { organizationId: string; branchId: string; userId: string },
  input: InventoryAdjustInput,
) {
  const [product] = await db
    .select({ id: schema.products.id, stock: schema.products.stock })
    .from(schema.products)
    .where(and(eq(schema.products.id, input.productId), eq(schema.products.organizationId, params.organizationId)))
    .limit(1);
  if (!product) throw new NotFoundError("Producto no encontrado");

  if (input.quantity < 0 && product.stock + input.quantity < 0) {
    throw new AppError("El ajuste dejaría el stock en negativo", 400, "NEGATIVE_STOCK");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.products)
      .set({ stock: sql`${schema.products.stock} + ${input.quantity}`, updatedAt: new Date() })
      .where(eq(schema.products.id, input.productId));

    await tx.insert(schema.inventoryMovements).values({
      organizationId: params.organizationId,
      branchId: params.branchId,
      productId: input.productId,
      type: input.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      quantity: Math.abs(input.quantity),
      userId: params.userId,
      note: input.note ?? null,
    });
  });

  return { success: true };
}
