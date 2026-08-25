/**
 * Las columnas de cantidad (`products.stock`, `sale_items.quantity`,
 * `inventory_movements.quantity`) son `numeric(12,3)` para admitir venta por
 * libra. Drizzle las lee y escribe como `string` para no perder precisión,
 * así que estas dos funciones son el único punto de conversión.
 */

/** Número → string para escribir en una columna numeric(12,3). */
export function toQuantity(value: number): string {
  return value.toFixed(3);
}

/** Valor leído de una columna numeric → number para operar en JS. */
export function fromQuantity(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}
