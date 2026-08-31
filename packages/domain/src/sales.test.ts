import { describe, expect, it } from "vitest";
import {
  calculateSubtotal,
  calculateTotal,
  canPerformAction,
  computePaymentSplit,
  isValidQuantity,
  validateCart,
} from "./sales.js";

describe("computePaymentSplit — pago partido crédito + efectivo", () => {
  it("con efectivo, todo el total va en efectivo", () => {
    expect(computePaymentSplit(120, "CASH", 500, 0)).toEqual({ credit: 0, cash: 120 });
  });

  it("a crédito completo, usa el total si alcanza el disponible", () => {
    expect(computePaymentSplit(120, "CREDIT", 500, 0)).toEqual({ credit: 120, cash: 0 });
  });

  it("a crédito, recorta al disponible cuando no alcanza", () => {
    expect(computePaymentSplit(120, "CREDIT", 100, 0)).toEqual({ credit: 100, cash: 20 });
  });

  it("a crédito sin nada disponible, queda todo en efectivo", () => {
    expect(computePaymentSplit(120, "CREDIT", 0, 0)).toEqual({ credit: 0, cash: 120 });
  });

  it("mixto respeta la cantidad elegida", () => {
    expect(computePaymentSplit(120, "MIXED", 500, 50)).toEqual({ credit: 50, cash: 70 });
  });

  it("mixto nunca fía más de lo disponible", () => {
    expect(computePaymentSplit(120, "MIXED", 100, 150)).toEqual({ credit: 100, cash: 20 });
  });

  it("mixto nunca fía más del total", () => {
    expect(computePaymentSplit(50, "MIXED", 500, 80)).toEqual({ credit: 50, cash: 0 });
  });

  it("mixto con monto negativo se trata como cero", () => {
    expect(computePaymentSplit(120, "MIXED", 500, -10)).toEqual({ credit: 0, cash: 120 });
  });

  it("siempre suma exactamente el total", () => {
    for (const total of [0.1, 9.99, 52, 100.75, 1234.56]) {
      for (const choice of ["CASH", "CREDIT", "MIXED"] as const) {
        for (const available of [0, 5, 50, 500]) {
          const split = computePaymentSplit(total, choice, available, available);
          const sum = Math.round((split.credit + split.cash) * 100) / 100;
          expect(sum).toBe(Math.round(total * 100) / 100);
        }
      }
    }
  });
});

describe("canPerformAction — matriz de permisos", () => {
  it("cajero vende, ve clientes y pedidos, pero no gestiona crédito", () => {
    expect(canPerformAction("CASHIER", "sales.create")).toBe(true);
    expect(canPerformAction("CASHIER", "customers.view")).toBe(true);
    expect(canPerformAction("CASHIER", "orders.view")).toBe(true);
    expect(canPerformAction("CASHIER", "customers.manage")).toBe(false);
    expect(canPerformAction("CASHIER", "orders.manage")).toBe(false);
    expect(canPerformAction("CASHIER", "products.manage")).toBe(false);
  });

  it("admin y encargado gestionan crédito y pedidos", () => {
    for (const role of ["ADMIN", "MANAGER"] as const) {
      expect(canPerformAction(role, "customers.manage")).toBe(true);
      expect(canPerformAction(role, "orders.manage")).toBe(true);
      expect(canPerformAction(role, "orders.view")).toBe(true);
    }
  });

  it("solo admin borra productos y gestiona usuarios", () => {
    expect(canPerformAction("ADMIN", "products.delete")).toBe(true);
    expect(canPerformAction("MANAGER", "products.delete")).toBe(false);
    expect(canPerformAction("ADMIN", "users.manage")).toBe(true);
    expect(canPerformAction("MANAGER", "users.manage")).toBe(false);
  });
});

describe("isValidQuantity / calculateSubtotal", () => {
  it("por libra admite decimales; por pieza solo enteros", () => {
    expect(isValidQuantity(1.5, "LB")).toBe(true);
    expect(isValidQuantity(1.0055, "LB")).toBe(false);
    expect(isValidQuantity(2, "UNIT")).toBe(true);
    expect(isValidQuantity(2.5, "UNIT")).toBe(false);
  });

  it("el subtotal cuadra en centavos aunque haya fracciones de libra", () => {
    const items = [
      { unitPrice: 52, quantity: 1.5 },
      { unitPrice: 28, quantity: 2.25 },
    ];
    expect(calculateSubtotal(items)).toBe(141);
  });

  it("el total respeta el descuento", () => {
    expect(calculateTotal(100, 15)).toBe(85);
    expect(calculateTotal(100, 150)).toBe(0);
  });
});

describe("validateCart", () => {
  it("detecta stock insuficiente", () => {
    const result = validateCart([
      { productId: "1", name: "Lomito", unitPrice: 52, quantity: 10, unit: "LB", stock: 5, barcode: null },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.reason).toBe("OUT_OF_STOCK");
  });

  it("permite stock negativo al sincronizar una venta offline", () => {
    const result = validateCart(
      [{ productId: "1", name: "Lomito", unitPrice: 52, quantity: 10, unit: "LB", stock: 5, barcode: null }],
      { allowNegativeStock: true },
    );
    expect(result.valid).toBe(true);
  });
});
