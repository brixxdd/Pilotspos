import { WEIGHT_DECIMALS, type CartItem, type ProductUnit, type UserRole } from "@pilotspos/types";
import { toCents, toPesos } from "./money.js";

// ---------------------------------------------------------------------------
// Cantidades y peso
// ---------------------------------------------------------------------------

const WEIGHT_FACTOR = 10 ** WEIGHT_DECIMALS;

/** Redondea un peso a los decimales que admite la BD (numeric(12,3)). */
export function roundQuantity(quantity: number): number {
  return Math.round(quantity * WEIGHT_FACTOR) / WEIGHT_FACTOR;
}

/**
 * Valida que la cantidad sea coherente con la unidad del producto:
 * los productos por pieza sólo admiten enteros; los de peso admiten
 * hasta `WEIGHT_DECIMALS` decimales.
 */
export function isValidQuantity(quantity: number, unit: ProductUnit): boolean {
  if (!Number.isFinite(quantity) || quantity <= 0) return false;
  if (unit === "UNIT") return Number.isInteger(quantity);
  return roundQuantity(quantity) === quantity;
}

/** Formatea una cantidad para mostrarla: "3.250 lb" o "2 pza". */
export function formatQuantity(quantity: number, unit: ProductUnit): string {
  return unit === "LB"
    ? `${quantity.toFixed(WEIGHT_DECIMALS)} lb`
    : `${Math.round(quantity)} pza`;
}

export interface CartLine {
  unitPrice: number;
  quantity: number;
}

/** Suma de (precio unitario × cantidad) de todas las líneas del carrito. */
export function calculateSubtotal(items: CartLine[]): number {
  // Con productos por libra la cantidad es fraccionaria (3.250 lb), así que el
  // producto precio × cantidad cae entre centavos. Se redondea por línea —
  // igual que la báscula del mostrador — para que la suma cuadre con el ticket.
  const cents = items.reduce(
    (sum, item) => sum + Math.round(toCents(item.unitPrice) * item.quantity),
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

/**
 * Valida que cada línea del carrito tenga cantidad positiva y stock suficiente.
 *
 * `allowNegativeStock` omite la validación de stock suficiente: se usa
 * únicamente al sincronizar ventas cerradas sin conexión, donde el cobro ya
 * ocurrió físicamente y rechazar la venta dejaría dinero en caja sin una
 * venta que lo respalde. La cantidad sigue debiendo ser válida para la unidad del producto
 * (entera si es por pieza, hasta 3 decimales si es por libra).
 */
export function validateCart(
  items: CartItem[],
  options: { allowNegativeStock?: boolean } = {},
): CartValidationResult {
  const errors: CartValidationError[] = [];

  for (const item of items) {
    if (!isValidQuantity(item.quantity, item.unit)) {
      errors.push({ productId: item.productId, reason: "INVALID_QUANTITY" });
      continue;
    }
    if (!options.allowNegativeStock && item.quantity > item.stock) {
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
