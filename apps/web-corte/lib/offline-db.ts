import type { ProductUnit } from "@pilotspos/types";
import Dexie, { type Table } from "dexie";
import type { PaymentMethod } from "@pilotspos/types";

/** Copia local del catálogo, usada para vender por código de barras sin conexión. */
export interface CachedProduct {
  id: string;
  name: string;
  price: string;
  /** Unidad de venta cacheada: sin ella la venta offline no sabría si pedir peso. */
  unit: ProductUnit;
  stock: number;
  minimumStock: number;
  barcodes: string[];
}

export interface OfflineSalePayment {
  method: PaymentMethod;
  amount: number;
  receivedAmount?: number;
}

/** Venta cerrada sin conexión, en espera de sincronizarse con el servidor. */
export interface PendingSale {
  clientSaleId: string;
  createdAt: string;
  items: { productId: string; quantity: number; name: string; unitPrice: number }[];
  discount: number;
  payments: OfflineSalePayment[];
  status: "pending" | "syncing" | "failed";
  lastError?: string;
}

class OfflineDatabase extends Dexie {
  products!: Table<CachedProduct, string>;
  pendingSales!: Table<PendingSale, string>;

  constructor() {
    super("pilotspos-offline");
    this.version(1).stores({
      products: "id, name, *barcodes",
      pendingSales: "clientSaleId, status, createdAt",
    });
  }
}

/**
 * Instancia única, perezosa: Dexie toca `indexedDB` al construirse, lo que
 * revienta en SSR (Next.js renderiza este módulo en el servidor también).
 * `getOfflineDb()` es el único punto de entrada — nunca importar `db` directo.
 */
let instance: OfflineDatabase | null = null;

export function getOfflineDb(): OfflineDatabase | null {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new OfflineDatabase();
  return instance;
}
