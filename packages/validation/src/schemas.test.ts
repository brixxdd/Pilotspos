import { describe, expect, it } from "vitest";
import {
  customerCreditUpdateSchema,
  customerPhoneSchema,
  menuOrderCreateSchema,
  productCreateSchema,
  productImportRowSchema,
  saleSchema,
} from "./index.js";

describe("customerPhoneSchema — teléfono guatemalteco", () => {
  it("normaliza espacios, guiones y el +502", () => {
    expect(customerPhoneSchema.parse("5512 3456")).toBe("55123456");
    expect(customerPhoneSchema.parse("+502 5512-3456")).toBe("55123456");
    expect(customerPhoneSchema.parse("55123456")).toBe("55123456");
  });

  it("rechaza teléfonos no válidos", () => {
    expect(customerPhoneSchema.safeParse("123456").success).toBe(false);
    expect(customerPhoneSchema.safeParse("91234567").success).toBe(false);
  });
});

describe("productCreateSchema", () => {
  it("aplica defaults de unidad y stock", () => {
    const parsed = productCreateSchema.parse({ name: "Hueso", sku: "RES-HUESO", price: 10 });
    expect(parsed.unit).toBe("UNIT");
    expect(parsed.stock).toBe(0);
    expect(parsed.barcodes).toEqual([]);
  });

  it("rechaza cantidades con más de 3 decimales", () => {
    const parsed = productCreateSchema.safeParse({
      name: "Lomito",
      sku: "RES-LOMITO",
      price: 52,
      stock: 1.0005,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza precios negativos", () => {
    expect(productCreateSchema.safeParse({ name: "X", sku: "S", price: -1 }).success).toBe(false);
  });
});

describe("saleSchema", () => {
  it("exige carrito y al menos un pago", () => {
    expect(saleSchema.safeParse({ items: [], payments: [] }).success).toBe(false);
    expect(
      saleSchema.safeParse({
        registerId: "00000000-0000-0000-0000-000000000000",
        items: [{ productId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
        payments: [{ method: "CASH", amount: 10 }],
      }).success,
    ).toBe(true);
  });
});

describe("customerCreditUpdateSchema", () => {
  it("no permite límite negativo", () => {
    expect(customerCreditUpdateSchema.safeParse({ creditLimit: -5 }).success).toBe(false);
    expect(customerCreditUpdateSchema.safeParse({ creditLimit: 0, balanceAdjustment: -25 }).success).toBe(true);
  });
});

describe("menuOrderCreateSchema", () => {
  it("exige por lo menos un renglón y cantidad válida", () => {
    expect(menuOrderCreateSchema.safeParse({ items: [], paymentChoice: "CASH" }).success).toBe(false);
    expect(
      menuOrderCreateSchema.safeParse({
        items: [{ productId: "00000000-0000-0000-0000-000000000000", quantity: 2 }],
        paymentChoice: "CREDIT",
      }).success,
    ).toBe(true);
  });
});

describe("productImportRowSchema", () => {
  it("acepta el nombre de la categoría y omite ids", () => {
    const parsed = productImportRowSchema.safeParse({
      name: "X",
      sku: "S",
      price: 5,
      categoryName: "Res",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "categoryName" in parsed.data).toBe(true);
  });
});
