import { toCents, toPesos } from "./money.js";

export interface CashSessionTotals {
  openingAmount: number;
  cashSales: number;
  deposits: number;
  withdrawals: number;
  refunds: number;
}

/**
 * Efectivo que debería existir físicamente en la caja al momento del corte.
 * expected = fondo inicial + ventas en efectivo + entradas - retiros - devoluciones
 */
export function calculateExpectedCash(totals: CashSessionTotals): number {
  const cents =
    toCents(totals.openingAmount) +
    toCents(totals.cashSales) +
    toCents(totals.deposits) -
    toCents(totals.withdrawals) -
    toCents(totals.refunds);
  return toPesos(cents);
}

/** Diferencia entre el efectivo esperado y el contado físicamente. Positivo = sobrante. */
export function calculateCashDifference(expectedCash: number, countedCash: number): number {
  return toPesos(toCents(countedCash) - toCents(expectedCash));
}
