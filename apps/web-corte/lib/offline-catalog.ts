import { getOfflineDb } from "./offline-db";
import type { ProductUnit } from "@pilotspos/types";
import type { ProductLookup } from "@/app/(app)/sales/types";

function toProductLookup(product: {
  id: string;
  name: string;
  price: string;
  unit: ProductUnit;
  stock: number;
  barcodes: string[];
}): ProductLookup {
  return {
    id: product.id,
    name: product.name,
    sku: "",
    price: product.price,
    unit: product.unit,
    stock: product.stock,
    active: true,
    barcodes: product.barcodes.map((barcode) => ({ barcode })),
  };
}

/** Búsqueda por código de barras exacto en el catálogo cacheado (fallback sin conexión). */
export async function lookupCachedProductByBarcode(barcode: string): Promise<ProductLookup | null> {
  const db = getOfflineDb();
  if (!db) return null;
  const product = await db.products.where("barcodes").equals(barcode).first();
  return product ? toProductLookup(product) : null;
}

/** Búsqueda por nombre en el catálogo cacheado (fallback sin conexión). */
export async function searchCachedProducts(query: string, limit = 6): Promise<ProductLookup[]> {
  const db = getOfflineDb();
  if (!db) return [];
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches = await db.products.filter((product) => product.name.toLowerCase().includes(needle)).limit(limit).toArray();
  return matches.map(toProductLookup);
}
