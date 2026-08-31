import { describe, expect, it } from "vitest";
import { reconcileCart } from "./menu-cart";
import type { StoredCart } from "./menu-cart";

function stored(items: Record<string, { quantity: number; price: number }>, updatedAt = Date.now()): StoredCart {
  return { v: 1, updatedAt, items };
}

function menu(lines: Array<[string, { name: string; price: number }]>) {
  return new Map(lines.map(([id, value]) => [id, value] as const));
}

describe("reconcileCart", () => {
  it("conserva los productos que siguen en el menú", () => {
    const result = reconcileCart(
      stored({ "a": { quantity: 1, price: 10 } }),
      menu([["a", { name: "Queso", price: 10 }]]),
    );
    expect(result.quantities).toEqual({ a: 1 });
    expect(result.removedCount).toBe(0);
    expect(result.repricedNames).toEqual([]);
  });

  it("una línea con cantidad 0 NO cuenta como producto que el menú perdió", () => {
    const result = reconcileCart(
      stored({
        a: { quantity: 0, price: 10 },
        b: { quantity: 2, price: 10 },
      }),
      menu([["a", { name: "Queso", price: 10 }]]),
    );
    expect(result.quantities).toEqual({});
    expect(result.removedCount).toBe(1);
  });

  it("cuenta y descarta los productos que ya no se venden", () => {
    const result = reconcileCart(
      stored({
        a: { quantity: 1, price: 10 },
        b: { quantity: 2, price: 20 },
      }),
      menu([["a", { name: "Queso", price: 10 }]]),
    );
    expect(result.quantities).toEqual({ a: 1 });
    expect(result.removedCount).toBe(1);
  });

  it("avisa de los precios que cambiaron", () => {
    const result = reconcileCart(
      stored({ a: { quantity: 1, price: 10 } }),
      menu([["a", { name: "Queso", price: 12 }]]),
    );
    expect(result.repricedNames).toEqual(["Queso"]);
    expect(result.quantities.a).toBe(1);
  });

  it("sin catálogo no se toca lo guardado (regla: una lectura que falla no escribe)", () => {
    const result = reconcileCart(stored({ a: { quantity: 1, price: 10 } }), new Map());
    expect(result.quantities).toEqual({});
    expect(result.removedCount).toBe(1);
  });
});
