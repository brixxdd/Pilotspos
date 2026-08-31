import { describe, expect, it } from "vitest";
import { calculateCashDifference, calculateExpectedCash } from "./cash.js";

describe("calculateExpectedCash — arqueo de caja", () => {
  it("suma fondo inicial, ventas y entradas, y resta retiros y devoluciones", () => {
    const expected = calculateExpectedCash({
      openingAmount: 500,
      cashSales: 1250.5,
      deposits: 200,
      withdrawals: 150,
      refunds: 25.25,
    });
    expect(expected).toBe(1775.25);
  });

  it("no deja errores de punto flotante en centavos", () => {
    const expected = calculateExpectedCash({
      openingAmount: 100.1,
      cashSales: 200.2,
      deposits: 0,
      withdrawals: 50.05,
      refunds: 0,
    });
    expect(expected).toBe(250.25);
  });

  it("una devolución puede dejar el esperado por debajo del fondo inicial", () => {
    const expected = calculateExpectedCash({
      openingAmount: 500,
      cashSales: 0,
      deposits: 0,
      withdrawals: 0,
      refunds: 600,
    });
    expect(expected).toBe(-100);
  });
});

describe("calculateCashDifference", () => {
  it("positivo cuando sobra efectivo, negativo cuando falta", () => {
    expect(calculateCashDifference(1000, 1020)).toBe(20);
    expect(calculateCashDifference(1000, 980)).toBe(-20);
    expect(calculateCashDifference(1000, 1000)).toBe(0);
  });
});
