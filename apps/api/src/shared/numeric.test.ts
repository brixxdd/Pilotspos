import { describe, expect, it } from "vitest";
import { fromQuantity, toQuantity } from "./numeric.js";

describe("toQuantity / fromQuantity — conversión numeric(12,3)", () => {
  it("toQuantity fija 3 decimales", () => {
    expect(toQuantity(1.5)).toBe("1.500");
    expect(toQuantity(0)).toBe("0.000");
    expect(toQuantity(12.755)).toBe("12.755");
  });

  it("fromQuantity convierte string a número", () => {
    expect(fromQuantity("48.250")).toBe(48.25);
    expect(fromQuantity("0.000")).toBe(0);
    expect(fromQuantity(12.755)).toBe(12.755);
  });

  it("fromQuantity trata null/undefined como 0", () => {
    expect(fromQuantity(null)).toBe(0);
    expect(fromQuantity(undefined)).toBe(0);
  });
});
