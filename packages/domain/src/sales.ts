import type { CartItem, UserRole } from "@pilotspos/types";
import { toCents, toPesos } from "./money.js";

export interface CartLine {
  unitPrice: number;
  quantity: number;
}

/** Suma de (precio unitario × cantidad) de todas las líneas del carrito. */
export function calculateSubtotal(items: CartLine[]): number {
  const cents = items.reduce(
    (sum, item) => sum + toCents(item.unitPrice) * item.quantity,
    0,
  );
  return toPesos(cents);
}

/** Recorta el descuento solicitado para que nunca exceda el subtotal ni sea negativo. */
export function calculateDiscount(subtotal: number, requestedDiscount: number): number {
  const subtotalCents = toCents(subtotal);
  const discountCents = Math.min(Math.max(toCents(requestedDiscount), 0), subtotalCents);
  return toPesos(discountCents);
}

export function calculateTotal(subtotal: number, discount: number): number {
  const totalCents = toCents(subtotal) - toCents(discount);
  return toPesos(Math.max(totalCents, 0));
}

/**
 * Calcula el cambio a entregar. Devuelve null si el monto recibido es
 * insuficiente para cubrir el total — el llamador debe rechazar el cobro.
 */
export function calculateChange(total: number, received: number): number | null {
  const changeCents = toCents(received) - toCents(total);
  if (changeCents < 0) return null;
  return toPesos(changeCents);
}

export interface CartValidationError {
  productId: string;
  reason: "OUT_OF_STOCK" | "INVALID_QUANTITY";
}

export interface CartValidationResult {
  valid: boolean;
  errors: CartValidationError[];
}

/** Valida que cada línea del carrito tenga cantidad positiva y stock suficiente. */
export function validateCart(items: CartItem[]): CartValidationResult {
  const errors: CartValidationError[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push({ productId: item.productId, reason: "INVALID_QUANTITY" });
      continue;
    }
    if (item.quantity > item.stock) {
      errors.push({ productId: item.productId, reason: "OUT_OF_STOCK" });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Autorización
// ---------------------------------------------------------------------------

export type PermissionAction =
  | "products.manage"
  | "products.delete"
  | "inventory.manage"
  | "inventory.adjust"
  | "cash.manage"
  | "sales.create"
  | "sales.discount"
  | "sales.cancel"
  | "reports.view"
  | "users.manage"
  | "settings.manage";

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  ADMIN: [
    "products.manage",
    "products.delete",
    "inventory.manage",
    "inventory.adjust",
    "cash.manage",
    "sales.create",
    "sales.discount",
    "sales.cancel",
    "reports.view",
    "users.manage",
    "settings.manage",
  ],
  MANAGER: [
    "products.manage",
    "inventory.manage",
    "inventory.adjust",
    "cash.manage",
    "sales.create",
    "sales.discount",
    "sales.cancel",
    "reports.view",
  ],
  CASHIER: ["sales.create"],
};

/** Única fuente de verdad para autorización por rol. Debe evaluarse en el backend. */
export function canPerformAction(role: UserRole, action: PermissionAction): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}
