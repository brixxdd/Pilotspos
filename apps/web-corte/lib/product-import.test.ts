import { describe, expect, it } from "vitest";
import { mapRowToInput, normalizeHeader, parseProductRow, toNumber, toUnit } from "./product-import";

describe("normalizeHeader", () => {
  it("quita acentos, espacios y mayúsculas", () => {
    expect(normalizeHeader(" Categoría ")).toBe("categoria");
    expect(normalizeHeader("Código de Barras")).toBe("codigodebarras");
  });
});

describe("toNumber / toUnit", () => {
  it("acepta comas decimales de la hoja legacy", () => {
    expect(toNumber("52,50")).toBe(52.5);
  });
  it("rechaza valores no numéricos", () => {
    expect(toNumber("abc")).toBeUndefined();
  });
  it("interpreta libra y pieza", () => {
    expect(toUnit("lb")).toBe("LB");
    expect(toUnit("Libras")).toBe("LB");
    expect(toUnit("pieza")).toBe("UNIT");
  });
});

describe("mapRowToInput", () => {
  it("mapea una fila con encabezados en español", () => {
    const input = mapRowToInput({
      Nombre: "Chuleta",
      SKU: "CER-01",
      Precio: "26",
      Costo: "19",
      Categoría: "Cerdo",
      Unidad: "lb",
      Stock: "10",
      Mínimo: "5",
      Códigos: "7401 7402",
    });
    expect(input).toEqual({
      name: "Chuleta",
      sku: "CER-01",
      price: 26,
      cost: 19,
      categoryName: "Cerdo",
      unit: "LB",
      stock: 10,
      minimumStock: 5,
      barcodes: ["7401", "7402"],
    });
  });

  it("ignora columnas desconocidas", () => {
    const input = mapRowToInput({ Nombre: "X", basura: "y" });
    expect(input.name).toBe("X");
    expect("basura" in input).toBe(false);
  });
});

describe("parseProductRow", () => {
  it("devuelve la fila validada si todo está bien", () => {
    const parsed = parseProductRow({ Nombre: "Hueso", SKU: "RES-HUESO", Precio: "10" }, 2);
    expect(parsed.error).toBeUndefined();
    expect(parsed.value).toMatchObject({ name: "Hueso", sku: "RES-HUESO", price: 10, unit: "UNIT", stock: 0 });
  });

  it("reporta el primer error con el número de fila", () => {
    const parsed = parseProductRow({ Nombre: "Hueso", SKU: "RES-HUESO" }, 5);
    expect(parsed.row).toBe(5);
    expect(parsed.error).toContain("precio");
    expect(parsed.value).toBeUndefined();
  });
});
