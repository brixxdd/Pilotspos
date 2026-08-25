import { and, asc, eq, exists, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "../../shared/db.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { ProductCreateInput, ProductUpdateInput } from "@pilotspos/validation";
import type { Paginated } from "@pilotspos/types";
import { fromQuantity, toQuantity } from "../../shared/numeric.js";

const DEFAULT_PAGE_SIZE = 30;

// Forma de fila tal como la devuelve Drizzle (con `Date` reales). El cliente
// HTTP recibe estos mismos campos serializados a ISO string por JSON.stringify;
// @pilotspos/types#ProductWithBarcodes describe esa forma ya-serializada.
type ProductRow = {
  id: string;
  categoryName: string | null;
  [key: string]: unknown;
};

async function attachBarcodes<T extends ProductRow>(products: T[]) {
  if (products.length === 0) return [] as Array<T & { barcodes: (typeof schema.productBarcodes.$inferSelect)[] }>;

  const productIds = products.map((p) => p.id);
  const barcodeRows = await db
    .select()
    .from(schema.productBarcodes)
    .where(sql`${schema.productBarcodes.productId} IN ${productIds}`);

  return products.map((product) => ({
    ...product,
    barcodes: barcodeRows.filter((b) => b.productId === product.id),
  }));
}

export async function listProducts(
  organizationId: string,
  options: { search?: string; page?: number; pageSize?: number; onlyActive?: boolean } = {},
): Promise<Paginated<unknown>> {
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, 100);
  const search = options.search?.trim();

  const conditions = [eq(schema.products.organizationId, organizationId)];
  if (options.onlyActive) conditions.push(eq(schema.products.active, true));

  if (search) {
    conditions.push(
      or(
        ilike(schema.products.name, `%${search}%`),
        ilike(schema.products.sku, `%${search}%`),
        exists(
          db
            .select({ id: schema.productBarcodes.id })
            .from(schema.productBarcodes)
            .where(
              and(
                eq(schema.productBarcodes.productId, schema.products.id),
                ilike(schema.productBarcodes.barcode, `%${search}%`),
              ),
            ),
        ),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(whereClause);
  const count = countRows[0]?.count ?? 0;

  const rows = await db
    .select({
      id: schema.products.id,
      organizationId: schema.products.organizationId,
      name: schema.products.name,
      description: schema.products.description,
      sku: schema.products.sku,
      price: schema.products.price,
      cost: schema.products.cost,
      unit: schema.products.unit,
      stock: schema.products.stock,
      minimumStock: schema.products.minimumStock,
      categoryId: schema.products.categoryId,
      supplierId: schema.products.supplierId,
      active: schema.products.active,
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
      categoryName: schema.categories.name,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
    .where(whereClause)
    .orderBy(asc(schema.products.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items = (await attachBarcodes(rows)).map((product) => ({
    ...product,
    stock: fromQuantity(product.stock),
    minimumStock: fromQuantity(product.minimumStock),
  }));

  return { items, total: count, page, pageSize };
}

/**
 * Snapshot plano de todo el catálogo activo, sin paginar. Lo consume el
 * cliente para poblar su caché local (IndexedDB) y poder seguir vendiendo
 * por código de barras si se corta la conexión — ver apps/web/lib/catalog-sync.ts.
 */
export async function getCatalogSnapshot(organizationId: string) {
  const rows = await db
    .select({
      id: schema.products.id,
      name: schema.products.name,
      price: schema.products.price,
      unit: schema.products.unit,
      stock: schema.products.stock,
      minimumStock: schema.products.minimumStock,
    })
    .from(schema.products)
    .where(and(eq(schema.products.organizationId, organizationId), eq(schema.products.active, true)))
    .orderBy(asc(schema.products.name));

  const barcodeRows = await db
    .select({ productId: schema.productBarcodes.productId, barcode: schema.productBarcodes.barcode })
    .from(schema.productBarcodes)
    .innerJoin(schema.products, eq(schema.products.id, schema.productBarcodes.productId))
    .where(eq(schema.products.organizationId, organizationId));

  const barcodesByProduct = new Map<string, string[]>();
  for (const row of barcodeRows) {
    const list = barcodesByProduct.get(row.productId) ?? [];
    list.push(row.barcode);
    barcodesByProduct.set(row.productId, list);
  }

  // El catálogo offline se guarda tal cual en IndexedDB y el punto de venta
  // compara contra el stock: se normaliza a número aquí, no en el cliente.
  return rows.map((product) => ({
    ...product,
    stock: fromQuantity(product.stock),
    minimumStock: fromQuantity(product.minimumStock),
    barcodes: barcodesByProduct.get(product.id) ?? [],
  }));
}

export async function getProductById(organizationId: string, id: string) {
  const [row] = await db
    .select({
      id: schema.products.id,
      organizationId: schema.products.organizationId,
      name: schema.products.name,
      description: schema.products.description,
      sku: schema.products.sku,
      price: schema.products.price,
      cost: schema.products.cost,
      unit: schema.products.unit,
      stock: schema.products.stock,
      minimumStock: schema.products.minimumStock,
      categoryId: schema.products.categoryId,
      supplierId: schema.products.supplierId,
      active: schema.products.active,
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
      categoryName: schema.categories.name,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
    .where(and(eq(schema.products.id, id), eq(schema.products.organizationId, organizationId)))
    .limit(1);

  if (!row) throw new NotFoundError("Producto no encontrado");
  const [withBarcodes] = await attachBarcodes([row]);
  return {
    ...withBarcodes!,
    stock: fromQuantity(row.stock),
    minimumStock: fromQuantity(row.minimumStock),
  };
}

export async function getProductByBarcode(
  organizationId: string,
  barcode: string,
) {
  const [row] = await db
    .select({ productId: schema.productBarcodes.productId })
    .from(schema.productBarcodes)
    .innerJoin(schema.products, eq(schema.products.id, schema.productBarcodes.productId))
    .where(
      and(
        eq(schema.productBarcodes.barcode, barcode),
        eq(schema.products.organizationId, organizationId),
        eq(schema.products.active, true),
      ),
    )
    .limit(1);

  if (!row) throw new NotFoundError("No se encontró ningún producto con ese código de barras");
  return getProductById(organizationId, row.productId);
}

async function assertBarcodesAvailable(barcodes: string[], excludeProductId?: string) {
  if (barcodes.length === 0) return;
  const existing = await db
    .select({ barcode: schema.productBarcodes.barcode, productId: schema.productBarcodes.productId })
    .from(schema.productBarcodes)
    .where(sql`${schema.productBarcodes.barcode} IN ${barcodes}`);

  const conflict = existing.find((row) => row.productId !== excludeProductId);
  if (conflict) {
    throw new ConflictError(`El código de barras ${conflict.barcode} ya está asignado a otro producto`);
  }
}

export async function createProduct(
  params: { organizationId: string; branchId: string | null; userId: string },
  input: ProductCreateInput,
) {
  await assertBarcodesAvailable(input.barcodes);

  const product = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.products)
      .values({
        organizationId: params.organizationId,
        name: input.name,
        description: input.description ?? null,
        sku: input.sku,
        price: input.price.toFixed(2),
        cost: input.cost.toFixed(2),
        unit: input.unit,
        stock: toQuantity(input.stock),
        minimumStock: toQuantity(input.minimumStock),
        categoryId: input.categoryId ?? null,
        supplierId: input.supplierId ?? null,
        active: input.active,
      })
      .returning();
    if (!created) throw new Error("No se pudo crear el producto");

    if (input.barcodes.length > 0) {
      await tx
        .insert(schema.productBarcodes)
        .values(input.barcodes.map((barcode) => ({ productId: created.id, barcode })));
    }

    if (input.stock > 0 && params.branchId) {
      await tx.insert(schema.inventoryMovements).values({
        organizationId: params.organizationId,
        branchId: params.branchId,
        productId: created.id,
        type: "INITIAL_STOCK",
        quantity: toQuantity(input.stock),
        userId: params.userId,
        note: "Stock inicial al dar de alta el producto",
      });
    }

    return created;
  });

  return getProductById(params.organizationId, product.id);
}

export async function updateProduct(
  organizationId: string,
  id: string,
  input: ProductUpdateInput,
) {
  const [existing] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, id), eq(schema.products.organizationId, organizationId)))
    .limit(1);
  if (!existing) throw new NotFoundError("Producto no encontrado");

  if (input.barcodes) {
    await assertBarcodesAvailable(input.barcodes, id);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.products)
      .set({
        name: input.name,
        description: input.description,
        sku: input.sku,
        price: input.price !== undefined ? input.price.toFixed(2) : undefined,
        cost: input.cost !== undefined ? input.cost.toFixed(2) : undefined,
        unit: input.unit,
        minimumStock:
          input.minimumStock !== undefined ? toQuantity(input.minimumStock) : undefined,
        categoryId: input.categoryId,
        supplierId: input.supplierId,
        active: input.active,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.products.id, id), eq(schema.products.organizationId, organizationId)));

    if (input.barcodes) {
      await tx.delete(schema.productBarcodes).where(eq(schema.productBarcodes.productId, id));
      if (input.barcodes.length > 0) {
        await tx
          .insert(schema.productBarcodes)
          .values(input.barcodes.map((barcode) => ({ productId: id, barcode })));
      }
    }
  });

  return getProductById(organizationId, id);
}

/** No se elimina físicamente: un producto puede estar referenciado por ventas históricas. */
export async function deactivateProduct(organizationId: string, id: string) {
  const [updated] = await db
    .update(schema.products)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(schema.products.id, id), eq(schema.products.organizationId, organizationId)))
    .returning({ id: schema.products.id });
  if (!updated) throw new NotFoundError("Producto no encontrado");
  return getProductById(organizationId, id);
}
