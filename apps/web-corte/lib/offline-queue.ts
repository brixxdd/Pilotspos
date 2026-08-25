import { calculateChange, calculateDiscount, calculateSubtotal, calculateTotal } from "@pilotspos/domain";
import { apiFetch, ApiClientError } from "./api-client";
import { getOfflineDb, type OfflineSalePayment, type PendingSale } from "./offline-db";
import type { SaleTicket } from "@/app/(app)/sales/types";

/** UUID fijo, sin significado: /sales/sync ignora registerId (el servidor deriva la caja de la sesión abierta). */
const PLACEHOLDER_REGISTER_ID = "00000000-0000-0000-0000-000000000000";

export interface OfflineCartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Cierra una venta localmente cuando no hay conexión con el servidor: calcula
 * el ticket con las mismas funciones puras que usa el backend, descuenta el
 * stock cacheado de forma optimista y encola la venta para sincronizarla
 * después. Devuelve un ticket marcado como pendiente para imprimir/mostrar.
 */
export async function queueOfflineSale(params: {
  items: OfflineCartLine[];
  discountInput: number;
  payments: OfflineSalePayment[];
}): Promise<SaleTicket> {
  const db = getOfflineDb();
  if (!db) throw new Error("La venta sin conexión no está disponible en este entorno");

  const subtotal = calculateSubtotal(params.items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })));
  const discount = calculateDiscount(subtotal, params.discountInput);
  const total = calculateTotal(subtotal, discount);
  const clientSaleId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const pending: PendingSale = {
    clientSaleId,
    createdAt,
    items: params.items,
    discount,
    payments: params.payments,
    status: "pending",
  };

  await db.transaction("rw", db.products, db.pendingSales, async () => {
    await db.pendingSales.add(pending);
    for (const item of params.items) {
      const cached = await db.products.get(item.productId);
      if (cached) await db.products.update(item.productId, { stock: cached.stock - item.quantity });
    }
  });

  const cashPayment = params.payments.find((p) => p.method === "CASH");
  const change = cashPayment ? calculateChange(total, cashPayment.receivedAmount ?? cashPayment.amount) : null;

  return {
    id: clientSaleId,
    saleNumber: "PENDIENTE",
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    total: total.toFixed(2),
    createdAt,
    branchName: "",
    cashierName: "",
    organizationName: "",
    items: params.items.map((i) => ({
      productName: i.name,
      unitPrice: i.unitPrice.toFixed(2),
      quantity: i.quantity,
      subtotal: (i.unitPrice * i.quantity).toFixed(2),
    })),
    payments: params.payments.map((p) => ({
      method: p.method,
      amount: p.amount.toFixed(2),
      receivedAmount: p.receivedAmount != null ? p.receivedAmount.toFixed(2) : null,
      changeAmount: p.method === "CASH" && change != null ? change.toFixed(2) : null,
    })),
  };
}

/**
 * Envía las ventas pendientes al servidor en el orden en que se cerraron.
 * Si una falla por falta de red, se detiene el lote entero (seguimos sin
 * conexión, se reintentará en el próximo tick); cualquier otro error se
 * registra en esa venta puntual y se sigue con las siguientes.
 */
export async function flushPendingSales(): Promise<void> {
  const db = getOfflineDb();
  if (!db) return;

  const pending = await db.pendingSales.where("status").anyOf(["pending", "failed"]).sortBy("createdAt");

  for (const sale of pending) {
    await db.pendingSales.update(sale.clientSaleId, { status: "syncing" });
    try {
      await apiFetch("/sales/sync", {
        method: "POST",
        body: JSON.stringify({
          registerId: PLACEHOLDER_REGISTER_ID,
          clientSaleId: sale.clientSaleId,
          items: sale.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          discount: sale.discount,
          payments: sale.payments,
        }),
      });
      await db.pendingSales.delete(sale.clientSaleId);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "NETWORK_ERROR") {
        await db.pendingSales.update(sale.clientSaleId, { status: "pending" });
        return; // seguimos sin conexión — se reintenta todo el lote más tarde
      }
      await db.pendingSales.update(sale.clientSaleId, {
        status: "failed",
        lastError: err instanceof ApiClientError ? err.message : "Error desconocido al sincronizar",
      });
    }
  }
}

export function startOfflineSalesSync(): () => void {
  void flushPendingSales();
  const handleOnline = () => void flushPendingSales();
  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
